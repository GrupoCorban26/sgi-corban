"""
ContactosAsignacionService - Lógica de asignación de leads y feedback.
Responsabilidad única: asignar leads a comerciales, gestionar feedback y crear clientes.
"""
import asyncio
import logging
import re
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, update, case
from fastapi import HTTPException
from app.models.comercial import ClienteContacto, Cliente, CasoLlamada, RegistroImportacion
from app.models.historial_llamadas import HistorialLlamada

logger = logging.getLogger(__name__)

DIAS_ABANDONO = 7  # Días sin feedback para liberar contactos automáticamente

_lock_cargar_base = asyncio.Lock()  # Mantener por safety (memoria), pero el real es en SQL


class ContactosAsignacionService:
    """Servicio de asignación y feedback para comerciales."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_mis_contactos_asignados(self, user_id: int):
        """Obtiene los contactos asignados al comercial."""
        stmt = select(
            ClienteContacto, 
            RegistroImportacion.razon_social,
            Cliente.razon_social,
            CasoLlamada
        ).outerjoin(RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc) \
         .outerjoin(Cliente, ClienteContacto.ruc == Cliente.ruc) \
         .outerjoin(CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id) \
         .where(
             ClienteContacto.asignado_a == user_id, 
             ClienteContacto.estado == 'ASIGNADO',
             ClienteContacto.is_active == True
         ).order_by(ClienteContacto.fecha_llamada.asc(), ClienteContacto.fecha_asignacion.desc())
         
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            cc, ri_rs, cl_rs, caso = row
            data.append({
                "id": cc.id,
                "ruc": cc.ruc,
                "nombre": cc.nombre,
                "razon_social": ri_rs or cl_rs or "Sin razón social",
                "telefono": cc.telefono,
                "correo": cc.correo,
                "cargo": cc.cargo,
                "contesto": 1 if (caso and caso.contestado) else 0,
                "caso_id": cc.caso_id,
                "caso_nombre": caso.nombre if caso else None,
                "comentario": cc.comentario,
                "estado": cc.estado,
                "fecha_asignacion": cc.fecha_asignacion,
                "fecha_llamada": cc.fecha_llamada,
                "is_client": cc.is_client
            })
        return data
    
    async def liberar_contactos_abandonados(self):
        """Libera contactos ASIGNADO sin feedback después de DIAS_ABANDONO días.
        También libera los contactos EN_GESTION asociados al mismo RUC."""
        fecha_limite = datetime.now() - timedelta(days=DIAS_ABANDONO)
        
        # Buscar contactos abandonados
        stmt_abandonados = select(ClienteContacto).where(
            ClienteContacto.estado == 'ASIGNADO',
            ClienteContacto.is_active == True,
            ClienteContacto.fecha_llamada.is_(None),
            ClienteContacto.fecha_asignacion <= fecha_limite
        )
        result = await self.db.execute(stmt_abandonados)
        abandonados = result.scalars().all()
        
        if not abandonados:
            return 0
        
        rucs_liberados = set()
        for contacto in abandonados:
            contacto.estado = 'DISPONIBLE'
            contacto.asignado_a = None
            contacto.fecha_asignacion = None
            contacto.lote_asignacion = None
            rucs_liberados.add(contacto.ruc)
        
        # Liberar también los contactos EN_GESTION de esos RUCs
        if rucs_liberados:
            await self.db.execute(update(ClienteContacto).where(
                ClienteContacto.ruc.in_(list(rucs_liberados)),
                ClienteContacto.estado == 'EN_GESTION',
                ClienteContacto.is_active == True
            ).values(estado='DISPONIBLE'))
        
        await self.db.commit()
        logger.info(f"Liberados {len(abandonados)} contactos abandonados de {len(rucs_liberados)} RUCs")
        return len(abandonados)

    async def cargar_base(self, user_id: int, pais_origen: list = None, partida_arancelaria: list = None):
        """
        Lógica de asignación optimizada. 
        Usa sp_getapplock para evitar race-conditions entre Workers e implementa Bulk Updates.
        """
        from sqlalchemy import text
        from sqlalchemy.orm import aliased

        # 0. Liberar contactos abandonados antes de procesar
        liberados = await self.liberar_contactos_abandonados()
        
        # 1. Verificar leads sin guardar
        stmt_check = select(func.count()).where(
            ClienteContacto.asignado_a == user_id,
            ClienteContacto.estado == 'ASIGNADO',
            ClienteContacto.is_active == True,
            ClienteContacto.fecha_llamada.is_(None)
        )
        leads_sin_guardar = (await self.db.execute(stmt_check)).scalar()
        
        if leads_sin_guardar > 0:
            raise HTTPException(400, f"Tienes {leads_sin_guardar} contactos sin guardar. Guarda todos los registros primero.")
        
        rucs_excluidos_info = {}
        
        async with self.db.begin_nested():
            # Bloqueo a nivel de BD para soportar --workers 4
            res = await self.db.execute(text("""
                DECLARE @res INT;
                EXEC @res = sp_getapplock @Resource = 'SgiCargarBase', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
                SELECT @res;
            """))
            lock_status = res.scalar()
            if lock_status < 0:
                raise HTTPException(409, "Carga de base en curso por otro usuario. Inténtalo de nuevo en unos segundos.")

            # 2. Marcar contactos anteriores como GESTIONADO
            stmt_update_prev = update(ClienteContacto).where(
                ClienteContacto.asignado_a == user_id,
                ClienteContacto.estado == 'ASIGNADO',
                ClienteContacto.is_active == True,
                ClienteContacto.fecha_llamada.isnot(None)
            ).values(estado='GESTIONADO')
            await self.db.execute(stmt_update_prev)
            
            # 3. Preparar exclusiones de forma optimizada (NOT EXISTS)
            cc2 = aliased(ClienteContacto)
            not_exists_en_gestion = ~select(cc2.id).where(
                cc2.ruc == ClienteContacto.ruc,
                cc2.estado.in_(['EN_GESTION', 'ASIGNADO']),
                cc2.is_active == True
            ).exists()
            
            not_exists_client = ~select(Cliente.id).where(
                Cliente.ruc == ClienteContacto.ruc
            ).exists()
            
            # Info excluidos para el frontend (Opcional, pero se mantiene de tu lógica original)
            stmt_excluidos_pipeline = select(
                Cliente.tipo_estado,
                func.count(func.distinct(Cliente.ruc)).label('total')
            ).where(Cliente.ruc.isnot(None), Cliente.tipo_estado.in_(['CAIDO', 'INACTIVO'])).group_by(Cliente.tipo_estado)
            
            resultado_excluidos = (await self.db.execute(stmt_excluidos_pipeline)).all()
            rucs_excluidos_info = {row.tipo_estado: row.total for row in resultado_excluidos}
            
            # 4. Seleccionar 50 Contactos Disponibles (1 por RUC, por orden FIFO)
            stmt_validos = select(
                ClienteContacto.id,
                ClienteContacto.ruc,
                RegistroImportacion.agentes_distintos,
                func.row_number().over(
                    partition_by=ClienteContacto.ruc, 
                    order_by=ClienteContacto.id.asc()
                ).label('rn')
            ).join(
                RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc
            ).where(
                ClienteContacto.is_client == False,
                ClienteContacto.is_active == True,
                ClienteContacto.estado == 'DISPONIBLE',
                not_exists_en_gestion,
                not_exists_client
            )
                
            if pais_origen:
                conditions = [RegistroImportacion.paises_origen.like(f"%{re.sub(r'[%_]', '', p)}%") for p in pais_origen]
                stmt_validos = stmt_validos.where(or_(*conditions))
            if partida_arancelaria:
                # Ya no tenemos partidas arancelarias en la DB, ignoramos este bloque o tiramos error
                pass
                
            subq_validos = stmt_validos.subquery('validos')
            
            # Priorizar: agentes 0 o >1 van primero. Agentes 1 van al final.
            prioridad_agentes = case(
                (subq_validos.c.agentes_distintos == 1, 1),
                else_=0
            )
            
            stmt_top50 = select(subq_validos.c.id, subq_validos.c.ruc).where(
                subq_validos.c.rn == 1
            ).order_by(
                prioridad_agentes.asc(),
                subq_validos.c.id.asc()
            ).limit(50)
            
            resultado_top50 = (await self.db.execute(stmt_top50)).all()
            contact_ids_to_assign = [r.id for r in resultado_top50]
            rucs_assigned = [r.ruc for r in resultado_top50]
            
            if not contact_ids_to_assign:
                return {
                    "success": True, "contactos": [], "cantidad": 0,
                    "message": "No hay más leads disponibles con esos filtros.",
                    "contactos_liberados": liberados,
                    "rucs_excluidos": rucs_excluidos_info
                }
                
            # 5. BULK UPDATE: Asignar los 50 contactos elegidos
            await self.db.execute(
                update(ClienteContacto)
                .where(ClienteContacto.id.in_(contact_ids_to_assign))
                .values(
                    asignado_a=user_id,
                    fecha_asignacion=func.now(),
                    lote_asignacion=func.coalesce(ClienteContacto.lote_asignacion, 0) + 1,
                    estado='ASIGNADO',
                    caso_id=None,
                    comentario=None,
                    fecha_llamada=None
                )
            )
            
            # 6. BULK UPDATE: Bloquear (EN_GESTION) el resto de números de esos RUCs
            await self.db.execute(
                update(ClienteContacto)
                .where(ClienteContacto.ruc.in_(rucs_assigned))
                .where(ClienteContacto.id.notin_(contact_ids_to_assign))
                .where(ClienteContacto.estado == 'DISPONIBLE')
                .where(ClienteContacto.is_active == True)
                .values(estado='EN_GESTION')
            )
            # El lock de sp_getapplock se libera automáticamente al finalizar begin_nested()

        await self.db.commit()
            
        # Obtener contactos asignados actualizados y devolver información
        contactos = await self.get_mis_contactos_asignados(user_id)
        return {
            "contactos": contactos,
            "cantidad": len(contactos),
            "contactos_liberados": liberados,
            "rucs_excluidos": rucs_excluidos_info
        }

    async def assign_leads_batch(self, user_id: int):
        """Asigna contactos a un comercial siguiendo la lógica de lotes y empresas únicas."""
        return await self.cargar_base(user_id)

    async def asignar_lead_manualmente(self, ruc: str, comercial_id: int, actor_id: int):
        """Asigna un lead (RUC) específico a un comercial de forma manual (para Jefaturas)."""
        # Verificar si hay contactos de este RUC disponibles
        stmt = select(ClienteContacto).where(
            ClienteContacto.ruc == ruc,
            ClienteContacto.estado == 'DISPONIBLE',
            ClienteContacto.is_active == True,
            ClienteContacto.is_client == False
        )
        contactos = (await self.db.execute(stmt)).scalars().all()
        
        if not contactos:
            # Buscar si ya está asignado
            stmt_asignado = select(ClienteContacto).where(
                ClienteContacto.ruc == ruc,
                ClienteContacto.estado.in_(['ASIGNADO', 'EN_GESTION']),
                ClienteContacto.is_active == True
            )
            asignado = (await self.db.execute(stmt_asignado)).scalars().first()
            if asignado:
                nombre_comercial = asignado.asignado_a if asignado.asignado_a else 'Otro'
                raise HTTPException(400, f"Este lead ya se encuentra en la cartera de otro comercial.")
            else:
                raise HTTPException(404, "No hay contactos disponibles para este RUC. Puedes usar la opción de 'Crear Manual'.")

        # Asignar el primero de los disponibles
        contact = contactos[0]
        contact.asignado_a = comercial_id
        contact.fecha_asignacion = func.now()
        contact.lote_asignacion = 0  # 0 indica asignación manual
        contact.estado = 'ASIGNADO'
        contact.caso_id = None
        contact.comentario = None
        contact.fecha_llamada = None
        
        # Marcar los demás del mismo RUC como EN_GESTION
        for c in contactos[1:]:
            c.estado = 'EN_GESTION'
            
        await self.db.commit()
        return {"success": True, "message": f"Lead {ruc} derivado exitosamente."}
    
    async def actualizar_feedback(self, contacto_id: int, caso_id: int, comentario: str, user_id: int = None):
        """Actualiza el feedback y crea Cliente si es positivo. Con TRANSACCIÓN EXPLÍCITA."""
        
        # Get Contact
        stmt_c = select(ClienteContacto).where(ClienteContacto.id == contacto_id)
        contact = (await self.db.execute(stmt_c)).scalars().first()
        if not contact: 
            raise HTTPException(404, "Contacto no encontrado")
        
        # Get Case
        stmt_caso = select(CasoLlamada).where(CasoLlamada.id == caso_id)
        caso = (await self.db.execute(stmt_caso)).scalars().first()
        # Definir si es un caso positivo (gestionable)
        is_positive = caso.gestionable if caso else False
        
        # Check if client exists
        stmt_cl = select(Cliente).where(Cliente.ruc == contact.ruc)
        cliente_existe = (await self.db.execute(stmt_cl)).scalars().first()
        
        mensaje = ""
        
        # TRANSACCIÓN EXPLÍCITA
        async with self.db.begin_nested():
            # Update Contact
            contact.caso_id = caso_id
            contact.comentario = comentario
            contact.fecha_llamada = func.now()
            contact.updated_at = func.now()
            
            if is_positive or cliente_existe:
                await self.db.execute(
                    update(ClienteContacto).where(ClienteContacto.ruc == contact.ruc).values(is_client=True)
                )
            # Guardar en Historial
            historial = HistorialLlamada(
                contacto_id=contact.id,
                ruc=contact.ruc,
                comercial_id=user_id or contact.asignado_a,
                caso_id=caso_id,
                comentario=comentario
            )
            self.db.add(historial)
            
            if cliente_existe:
                mensaje = f"Nota: Este cliente ya está siendo gestionado (ID: {cliente_existe.id})"
            
            # Logic: Positive (Gestionable) AND Not Exists -> Create Client
            if is_positive and not cliente_existe:
                # Get additional info from RegistroImportacion
                stmt_ri = select(RegistroImportacion).where(RegistroImportacion.ruc == contact.ruc)
                ri = (await self.db.execute(stmt_ri)).scalars().first()
                razon_social = (ri.razon_social if ri and ri.razon_social else "Sin razón social")
                
                nuevo_cliente = Cliente(
                    ruc=contact.ruc,
                    razon_social=razon_social,
                    comercial_encargado_id=user_id or contact.asignado_a,
                    tipo_estado='PROSPECTO',
                    origen='BASE_DATOS',
                    ultimo_contacto=func.now(),
                    comentario_ultima_llamada=comentario,
                    is_active=True,
                    created_by=user_id
                )
                self.db.add(nuevo_cliente)
                await self.db.flush()
                
                # Mark all contacts of this RUC as is_client
                await self.db.execute(
                    update(ClienteContacto).where(ClienteContacto.ruc == contact.ruc).values(is_client=True)
                )
                
                # Mark managed
                await self.db.execute(update(ClienteContacto).where(
                    ClienteContacto.ruc == contact.ruc, 
                    ClienteContacto.estado == 'EN_GESTION',
                    ClienteContacto.is_active == True
                ).values(estado='GESTIONADO'))
                
                # Ensure others stay in EN_GESTION (Implicit, but clarify intent: they are NOT released)
                # No action needed as they are already EN_GESTION or ASIGNADO

            # Logic: Negative (Not Gestionable) -> Release others
            if not is_positive and not cliente_existe:
                # El contacto actual ESTABA cambiando a GESTIONADO aquí (lo que lo ocultaba de la UI).
                # Ahora conservará su estado actual (ASIGNADO) hasta que se "Cargue Base" nuevamente.
                
                await self.db.execute(update(ClienteContacto).where(
                    ClienteContacto.ruc == contact.ruc,
                    ClienteContacto.estado.in_(['EN_GESTION', 'ASIGNADO']), # Release all pending
                    ClienteContacto.id != contact.id, # Except current
                    ClienteContacto.is_active == True
                ).values(estado='DISPONIBLE'))
        
        await self.db.commit()
        return {"success": True, "mensaje": mensaje}
    
    async def enviar_feedback_lote(self, user_id: int):
        """Envía el feedback de todos los contactos asignados y los marca como gestionados."""
        async with self.db.begin_nested():
            stmt = update(ClienteContacto).where(
                ClienteContacto.asignado_a == user_id,
                ClienteContacto.estado == 'ASIGNADO',
                ClienteContacto.is_active == True,
                ClienteContacto.fecha_llamada.isnot(None)
            ).values(estado='GESTIONADO')
            await self.db.execute(stmt)
        
        await self.db.commit()
        return {"success": True, "message": "Feedback enviado correctamente"}
    
    async def get_filtros_base(self):
        """Obtiene países disponibles para filtrar."""
        from collections import Counter
        
        # Obtener todos los valores de paises_origen
        resultado = await self.db.execute(
            select(
                RegistroImportacion.paises_origen
            ).where(RegistroImportacion.paises_origen.isnot(None))
        )
        filas = resultado.all()
        
        # Procesar países: separador ' - ' o '/'
        contador_paises = Counter()
        for fila in filas:
            if fila.paises_origen:
                # Separar por guiones o diagonales si existen múltiples países en una celda
                partes = fila.paises_origen.replace('/', '-').split('-')
                for parte in partes:
                    pais_limpio = parte.strip()
                    if pais_limpio:
                        contador_paises[pais_limpio] += 1
        
        paises = [
            {"pais": pais, "cantidad": cantidad}
            for pais, cantidad in contador_paises.most_common()
        ]
        
        return {"paises": paises, "partidas": []}

    async def create_contacto_manual(self, data, user_id: int):
        """Crea un contacto manual y lo asigna inmediatamente al comercial.
        
        Mejoras:
        - Duplicado inteligente: si RUC+telefono ya existe, actualiza datos en vez de fallar.
        - crear_como_prospecto: si es True, crea un Cliente (PROSPECTO) directo a cartera.
        """
        contacto_actualizado = False
        prospecto_creado = False
        cliente_ya_existia = False
        
        # 1. Buscar duplicado (RUC + Teléfono)
        contacto_existente = None
        if data.telefono:
            stmt_dup = select(ClienteContacto).where(
                ClienteContacto.ruc == data.ruc,
                ClienteContacto.telefono == data.telefono,
                ClienteContacto.is_active == True
            )
            contacto_existente = (await self.db.execute(stmt_dup)).scalars().first()
        
        if contacto_existente:
            # Actualizar datos del contacto existente en vez de fallar
            if data.nombre:
                contacto_existente.nombre = data.nombre
            if data.cargo:
                contacto_existente.cargo = data.cargo
            if data.email:
                contacto_existente.correo = data.email
            contacto_existente.updated_at = func.now()
            
            # Si no está asignado a nadie, asignar al comercial actual
            if contacto_existente.estado == 'DISPONIBLE' or contacto_existente.asignado_a is None:
                contacto_existente.asignado_a = user_id
                contacto_existente.fecha_asignacion = func.now()
                contacto_existente.estado = 'ASIGNADO'
            
            contacto = contacto_existente
            contacto_actualizado = True
        else:
            # 2. Crear contacto nuevo
            contacto = ClienteContacto(
                ruc=data.ruc,
                nombre=data.nombre or "Sin nombre",
                cargo=data.cargo,
                telefono=data.telefono,
                correo=data.email,
                origen='MANUAL',
                is_client=False,
                is_active=True,
                estado='ASIGNADO',
                asignado_a=user_id,
                fecha_asignacion=func.now(),
                lote_asignacion=0  # 0 para manuales
            )
            self.db.add(contacto)
        
        # 3. Si crear_como_prospecto → crear Cliente automáticamente
        if getattr(data, 'crear_como_prospecto', False):
            # Verificar si ya existe un Cliente para este RUC
            stmt_cl = select(Cliente).where(
                Cliente.ruc == data.ruc,
                Cliente.is_active == True
            )
            cliente_existente = (await self.db.execute(stmt_cl)).scalars().first()
            
            if cliente_existente:
                cliente_ya_existia = True
                # Solo marcar contacto como is_client
                contacto.is_client = True
            else:
                # Obtener razón social
                rs_result = (await self.db.execute(
                    select(RegistroImportacion.razon_social).where(
                        RegistroImportacion.ruc == data.ruc
                    )
                )).scalar()
                if not rs_result:
                    rs_result = data.nombre  # Usar nombre del contacto como fallback
                
                nuevo_cliente = Cliente(
                    ruc=data.ruc,
                    razon_social=rs_result or "Sin razón social",
                    comercial_encargado_id=user_id,
                    tipo_estado='PROSPECTO',
                    origen='BASE_DATOS',
                    ultimo_contacto=func.now(),
                    comentario_ultima_llamada=f"Contacto referido: {data.nombre}",
                    is_active=True,
                    created_by=user_id
                )
                self.db.add(nuevo_cliente)
                
                # Marcar contacto y todos los del mismo RUC como is_client
                contacto.is_client = True
                await self.db.execute(
                    update(ClienteContacto).where(
                        ClienteContacto.ruc == data.ruc,
                        ClienteContacto.is_active == True
                    ).values(is_client=True)
                )
                prospecto_creado = True
            
            # Marcar contacto como GESTIONADO (ya pasó a cartera)
            contacto.estado = 'GESTIONADO'
            contacto.fecha_llamada = func.now()
        
        await self.db.commit()
        await self.db.refresh(contacto)
        
        # Obtener razón social para respuesta
        rs_result = (await self.db.execute(
            select(RegistroImportacion.razon_social).where(
                RegistroImportacion.ruc == data.ruc
            )
        )).scalar()
        if not rs_result:
            rs_result = (await self.db.execute(
                select(Cliente.razon_social).where(Cliente.ruc == data.ruc)
            )).scalar()
        
        return {
            "id": contacto.id,
            "ruc": contacto.ruc,
            "nombre": contacto.nombre,
            "razon_social": rs_result or "Sin razón social",
            "telefono": contacto.telefono,
            "correo": contacto.correo,
            "cargo": contacto.cargo,
            "contesto": 0,
            "caso_id": None,
            "caso_nombre": None,
            "comentario": None,
            "estado": contacto.estado,
            "fecha_asignacion": contacto.fecha_asignacion,
            "fecha_llamada": contacto.fecha_llamada,
            "is_client": contacto.is_client,
            # Flags para el frontend
            "actualizado": contacto_actualizado,
            "prospecto_creado": prospecto_creado,
            "cliente_ya_existia": cliente_ya_existia
        }

