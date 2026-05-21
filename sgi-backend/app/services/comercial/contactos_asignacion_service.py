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
from app.models.comercial import ClienteContacto, Cliente, CasoLlamada, RegistroImportacion, LoteContactos
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial_catalogos import EstadoContacto, EstadoCliente, OrigenCliente

logger = logging.getLogger(__name__)

DIAS_ABANDONO = 7  # Días sin feedback para liberar contactos automáticamente

_lock_cargar_base = asyncio.Lock()  # Mantener por safety (memoria), pero el real es en SQL


class ContactosAsignacionService:
    """Servicio de asignación y feedback para comerciales."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_estado_contacto_id(self, nombre: str) -> int:
        result = await self.db.execute(select(EstadoContacto.id).where(EstadoContacto.nombre == nombre))
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado contacto '{nombre}' no encontrado")
        return estado_id

    async def _get_estado_cliente_id(self, nombre: str) -> int:
        result = await self.db.execute(select(EstadoCliente.id).where(EstadoCliente.nombre == nombre))
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado cliente '{nombre}' no encontrado")
        return estado_id

    async def _get_origen_cliente_id(self, nombre: str) -> int:
        result = await self.db.execute(select(OrigenCliente.id).where(OrigenCliente.nombre == nombre))
        origen_id = result.scalar()
        if not origen_id:
            return None # Opcional
        return origen_id

    async def get_mis_contactos_asignados(self, user_id: int):
        """Obtiene los contactos asignados al comercial via historial_llamadas."""
        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')

        ri_subq = select(RegistroImportacion.razon_social).where(RegistroImportacion.ruc == ClienteContacto.ruc).limit(1).correlate(ClienteContacto).scalar_subquery()
        cl_subq = select(Cliente.razon_social).where(Cliente.ruc == ClienteContacto.ruc).limit(1).correlate(ClienteContacto).scalar_subquery()

        stmt = select(
            HistorialLlamada,
            ClienteContacto,
            ri_subq.label('ri_rs'),
            cl_subq.label('cl_rs'),
            CasoLlamada,
            EstadoContacto.nombre.label('estado_nombre')
        ).join(ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id
        ).outerjoin(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id
        ).outerjoin(EstadoContacto, ClienteContacto.estado_id == EstadoContacto.id
        ).where(
            HistorialLlamada.comercial_id == user_id,
            ClienteContacto.estado_id == estado_asignado_id,
            ClienteContacto.is_active == True
        ).order_by(HistorialLlamada.caso_id.asc(), HistorialLlamada.created_at.desc())

        result = await self.db.execute(stmt)
        data = []
        seen_contactos = set()
        for row in result.all():
            hl, cc, ri_rs, cl_rs, caso, estado_nombre = row
            if cc.id in seen_contactos:
                continue
            seen_contactos.add(cc.id)
            
            data.append({
                "id": cc.id,
                "historial_id": hl.id,
                "ruc": cc.ruc,
                "nombre": cc.nombre,
                "razon_social": ri_rs or cl_rs or "Sin razón social",
                "telefono": cc.telefono,
                "correo": cc.correo,
                "cargo": cc.cargo,
                "contesto": 1 if (caso and caso.contestado) else 0,
                "caso_id": hl.caso_id,
                "caso_nombre": caso.nombre if caso else None,
                "comentario": hl.comentario,
                "estado": estado_nombre,
                "fecha_asignacion": hl.created_at,
                "completado": hl.caso_id is not None,
            })
        return data
    
    async def liberar_contactos_abandonados(self):
        """Libera contactos ASIGNADO sin feedback después de DIAS_ABANDONO días.
        Usa historial_llamadas.caso_id IS NULL + created_at antiguo."""
        fecha_limite = datetime.now() - timedelta(days=DIAS_ABANDONO)

        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')
        estado_en_gestion_id = await self._get_estado_contacto_id('EN_GESTION')

        # Buscar historial abandonados: caso_id IS NULL y creado hace más de X días
        stmt_abandonados = select(HistorialLlamada.contacto_id, ClienteContacto.ruc).join(
            ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id
        ).where(
            HistorialLlamada.caso_id.is_(None),
            HistorialLlamada.created_at <= fecha_limite,
            ClienteContacto.estado_id == estado_asignado_id,
            ClienteContacto.is_active == True
        )
        result = await self.db.execute(stmt_abandonados)
        abandonados = result.all()

        if not abandonados:
            return 0

        contact_ids = [r.contacto_id for r in abandonados]
        rucs_liberados = set(r.ruc for r in abandonados)

        # Liberar contactos asignados
        await self.db.execute(update(ClienteContacto).where(
            ClienteContacto.id.in_(contact_ids)
        ).values(estado_id=estado_disponible_id))

        # Liberar EN_GESTION del mismo RUC
        if rucs_liberados:
            await self.db.execute(update(ClienteContacto).where(
                ClienteContacto.ruc.in_(list(rucs_liberados)),
                ClienteContacto.estado_id == estado_en_gestion_id,
                ClienteContacto.is_active == True
            ).values(estado_id=estado_disponible_id))

        # Eliminar historial huérfano
        from sqlalchemy import delete as sql_delete
        await self.db.execute(sql_delete(HistorialLlamada).where(
            HistorialLlamada.contacto_id.in_(contact_ids),
            HistorialLlamada.caso_id.is_(None)
        ))

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
        
        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')
        estado_gestionado_id = await self._get_estado_contacto_id('GESTIONADO')
        estado_en_gestion_id = await self._get_estado_contacto_id('EN_GESTION')
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')

        estado_caido_id = await self._get_estado_cliente_id('CAIDO')
        estado_inactivo_id = await self._get_estado_cliente_id('INACTIVO')

        # 1. Verificar leads sin guardar (historial con caso_id IS NULL)
        stmt_check = select(func.count()).select_from(HistorialLlamada).join(
            ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id
        ).where(
            HistorialLlamada.comercial_id == user_id,
            HistorialLlamada.caso_id.is_(None),
            ClienteContacto.estado_id == estado_asignado_id,
            ClienteContacto.is_active == True
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
            # (contactos ASIGNADO donde el historial ya tiene caso_id = completados)
            subq_completados = select(HistorialLlamada.contacto_id).where(
                HistorialLlamada.comercial_id == user_id,
                HistorialLlamada.caso_id.isnot(None)
            ).subquery()
            await self.db.execute(
                update(ClienteContacto).where(
                    ClienteContacto.id.in_(select(subq_completados)),
                    ClienteContacto.estado_id == estado_asignado_id,
                    ClienteContacto.is_active == True
                ).values(estado_id=estado_gestionado_id)
            )
            
            # 3. Preparar exclusiones de forma optimizada (NOT EXISTS)
            cc2 = aliased(ClienteContacto)
            not_exists_en_gestion = ~select(cc2.id).where(
                cc2.ruc == ClienteContacto.ruc,
                cc2.estado_id.in_([estado_en_gestion_id, estado_asignado_id]),
                cc2.is_active == True
            ).exists()
            
            not_exists_client = ~select(Cliente.id).where(
                Cliente.ruc == ClienteContacto.ruc
            ).exists()
            
            # Info excluidos para el frontend
            stmt_excluidos_pipeline = select(
                EstadoCliente.nombre,
                func.count(func.distinct(Cliente.ruc)).label('total')
            ).outerjoin(EstadoCliente, Cliente.estado_id == EstadoCliente.id)\
            .where(Cliente.ruc.isnot(None), Cliente.estado_id.in_([estado_caido_id, estado_inactivo_id]))\
            .group_by(EstadoCliente.nombre)
            
            resultado_excluidos = (await self.db.execute(stmt_excluidos_pipeline)).all()
            rucs_excluidos_info = {row.nombre: row.total for row in resultado_excluidos}
            
            # 4. Seleccionar 50 Contactos Disponibles (1 por RUC, por orden FIFO)
            # Solo de lotes activos
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
            ).outerjoin(
                LoteContactos, ClienteContacto.lote_id == LoteContactos.id
            ).where(
                ClienteContacto.is_active == True,
                ClienteContacto.estado_id == estado_disponible_id,
                not_exists_en_gestion,
                not_exists_client,
                # Solo contactos de lotes activos (o sin lote para compatibilidad)
                or_(LoteContactos.is_active == True, ClienteContacto.lote_id.is_(None))
            )
                
            if pais_origen:
                conditions = [RegistroImportacion.paises_principales.like(f"%{re.sub(r'[%_]', '', p)}%") for p in pais_origen]
                stmt_validos = stmt_validos.where(or_(*conditions))
            if partida_arancelaria:
                conditions_partida = [RegistroImportacion.sector.like(f"%{re.sub(r'[%_]', '', p)}%") for p in partida_arancelaria]
                stmt_validos = stmt_validos.where(or_(*conditions_partida))
                
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
                
            # 5. BULK UPDATE: solo cambiar estado a ASIGNADO
            await self.db.execute(
                update(ClienteContacto)
                .where(ClienteContacto.id.in_(contact_ids_to_assign))
                .values(estado_id=estado_asignado_id)
            )
            
            # 5b. Crear registros en historial_llamadas (caso_id=NULL = pendiente)
            for cid in contact_ids_to_assign:
                self.db.add(HistorialLlamada(
                    contacto_id=cid,
                    comercial_id=user_id,
                    caso_id=None,
                    comentario=None,
                    estado_id=estado_asignado_id
                ))
            
            # 6. BULK UPDATE: Bloquear (EN_GESTION) el resto de números de esos RUCs
            await self.db.execute(
                update(ClienteContacto)
                .where(ClienteContacto.ruc.in_(rucs_assigned))
                .where(ClienteContacto.id.notin_(contact_ids_to_assign))
                .where(ClienteContacto.estado_id == estado_disponible_id)
                .where(ClienteContacto.is_active == True)
                .values(estado_id=estado_en_gestion_id)
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
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')
        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')
        estado_en_gestion_id = await self._get_estado_contacto_id('EN_GESTION')

        # Verificar si hay contactos de este RUC disponibles
        stmt = select(ClienteContacto).where(
            ClienteContacto.ruc == ruc,
            ClienteContacto.estado_id == estado_disponible_id,
            ClienteContacto.is_active == True
        )
        contactos = (await self.db.execute(stmt)).scalars().all()
        
        if not contactos:
            stmt_asignado = select(ClienteContacto).where(
                ClienteContacto.ruc == ruc,
                ClienteContacto.estado_id.in_([estado_asignado_id, estado_en_gestion_id]),
                ClienteContacto.is_active == True
            )
            asignado = (await self.db.execute(stmt_asignado)).scalars().first()
            if asignado:
                raise HTTPException(400, "Este lead ya se encuentra en la cartera de otro comercial.")
            else:
                raise HTTPException(404, "No hay contactos disponibles para este RUC.")

        contact = contactos[0]
        contact.estado_id = estado_asignado_id
        
        # Crear historial de asignación
        self.db.add(HistorialLlamada(
            contacto_id=contact.id, comercial_id=comercial_id,
            caso_id=None, comentario=None, estado_id=estado_asignado_id
        ))
        
        # Marcar los demás del mismo RUC como EN_GESTION
        for c in contactos[1:]:
            c.estado_id = estado_en_gestion_id
            
        await self.db.commit()
        return {"success": True, "message": f"Lead {ruc} derivado exitosamente."}

    async def actualizar_feedback(self, contacto_id: int, caso_id: int, comentario: str, user_id: int = None):
        """Actualiza el feedback en historial_llamadas y gestiona estados.
        Soporta tanto guardado inicial (caso_id IS NULL) como re-edición."""
        estado_gestionado_id = await self._get_estado_contacto_id('GESTIONADO')
        estado_en_gestion_id = await self._get_estado_contacto_id('EN_GESTION')
        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')
        estado_prospecto_id = await self._get_estado_cliente_id('PROSPECTO')
        origen_bd_id = await self._get_origen_cliente_id('BASE_DATOS')

        # Get Contact
        contact = (await self.db.execute(
            select(ClienteContacto).where(ClienteContacto.id == contacto_id)
        )).scalars().first()
        if not contact:
            raise HTTPException(404, "Contacto no encontrado")

        # Buscar historial: primero pendiente (caso_id NULL), luego el más reciente
        historial = (await self.db.execute(
            select(HistorialLlamada).where(
                HistorialLlamada.contacto_id == contacto_id,
                HistorialLlamada.comercial_id == user_id,
                HistorialLlamada.caso_id.is_(None)
            )
        )).scalars().first()

        is_edit = False
        if not historial:
            # No hay pendiente → buscar el más reciente ya completado (re-edición)
            historial = (await self.db.execute(
                select(HistorialLlamada).where(
                    HistorialLlamada.contacto_id == contacto_id,
                    HistorialLlamada.comercial_id == user_id,
                ).order_by(HistorialLlamada.updated_at.desc())
            )).scalars().first()
            is_edit = True

        if not historial:
            raise HTTPException(404, "Registro de historial no encontrado")

        # Get previous and new case info
        caso_anterior = None
        if is_edit and historial.caso_id:
            caso_anterior = (await self.db.execute(
                select(CasoLlamada).where(CasoLlamada.id == historial.caso_id)
            )).scalars().first()

        caso_nuevo = (await self.db.execute(
            select(CasoLlamada).where(CasoLlamada.id == caso_id)
        )).scalars().first()
        is_positive = caso_nuevo.gestionable if caso_nuevo else False
        was_positive = (caso_anterior.gestionable if caso_anterior else False) if is_edit else False

        # Check if client exists
        cliente_existe = (await self.db.execute(
            select(Cliente).where(Cliente.ruc == contact.ruc)
        )).scalars().first()

        mensaje = ""

        async with self.db.begin_nested():
            # Update historial record
            historial.caso_id = caso_id
            historial.comentario = comentario
            historial.updated_at = func.now()

            if is_edit and was_positive and not is_positive and cliente_existe:
                mensaje = f"⚠️ Se cambió a caso negativo pero el prospecto (ID: {cliente_existe.id}) sigue activo en cartera."

            elif cliente_existe and not is_edit:
                mensaje = f"Nota: Este cliente ya está siendo gestionado (ID: {cliente_existe.id})"

            if is_positive and not cliente_existe:
                ri = (await self.db.execute(
                    select(RegistroImportacion).where(RegistroImportacion.ruc == contact.ruc)
                )).scalars().first()
                razon_social = (ri.razon_social if ri and ri.razon_social else "Sin razón social")
                nuevo_cliente = Cliente(
                    ruc=contact.ruc, razon_social=razon_social,
                    comercial_encargado_id=user_id,
                    estado_id=estado_prospecto_id, origen_id=origen_bd_id,
                    proxima_fecha_contacto=func.now(), is_active=True, created_by=user_id
                )
                self.db.add(nuevo_cliente)
                await self.db.flush()

            elif not is_positive:
                # Solo liberar EN_GESTION → DISPONIBLE (el asignado se queda ASIGNADO)
                await self.db.execute(update(ClienteContacto).where(
                    ClienteContacto.ruc == contact.ruc,
                    ClienteContacto.estado_id == estado_en_gestion_id,
                    ClienteContacto.id != contact.id,
                    ClienteContacto.is_active == True
                ).values(estado_id=estado_disponible_id))

        await self.db.commit()
        return {"success": True, "mensaje": mensaje}
    
    async def enviar_feedback_lote(self, user_id: int):
        """Finaliza el lote: contactos con feedback completado -> GESTIONADO."""
        estado_gestionado_id = await self._get_estado_contacto_id('GESTIONADO')
        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')

        async with self.db.begin_nested():
            subq = select(HistorialLlamada.contacto_id).where(
                HistorialLlamada.comercial_id == user_id,
                HistorialLlamada.caso_id.isnot(None)
            ).subquery()
            await self.db.execute(
                update(ClienteContacto).where(
                    ClienteContacto.id.in_(select(subq)),
                    ClienteContacto.estado_id == estado_asignado_id,
                    ClienteContacto.is_active == True
                ).values(estado_id=estado_gestionado_id)
            )
        
        await self.db.commit()
        return {"success": True, "message": "Feedback enviado correctamente"}
    
    async def get_filtros_base(self):
        """Obtiene países y sectores disponibles para filtrar."""
        from collections import Counter
        
        # Obtener todos los valores de paises_principales
        resultado = await self.db.execute(
            select(
                RegistroImportacion.paises_principales
            ).where(RegistroImportacion.paises_principales.isnot(None))
        )
        filas = resultado.all()
        
        # Procesar países: separador ' | '
        contador_paises = Counter()
        for fila in filas:
            if fila.paises_principales:
                partes = fila.paises_principales.replace('/', '|').split('|')
                for parte in partes:
                    pais_limpio = parte.strip()
                    if pais_limpio:
                        contador_paises[pais_limpio] += 1
        
        paises = [
            {"pais": pais, "cantidad": cantidad}
            for pais, cantidad in contador_paises.most_common()
        ]
        
        # Obtener sectores
        resultado_sectores = await self.db.execute(
            select(
                RegistroImportacion.sector
            ).where(RegistroImportacion.sector.isnot(None))
        )
        filas_sectores = resultado_sectores.all()
        
        contador_sectores = Counter()
        for fila in filas_sectores:
            if fila.sector:
                partes = fila.sector.split(' | ')
                for parte in partes:
                    sector_limpio = parte.strip()
                    if sector_limpio:
                        contador_sectores[sector_limpio] += 1
        
        sectores = [
            {"sector": sector, "cantidad": cantidad}
            for sector, cantidad in contador_sectores.most_common()
        ]
        
        return {"paises": paises, "sectores": sectores}

    async def create_contacto_manual(self, data, user_id: int):
        """Crea un contacto manual y lo asigna inmediatamente al comercial."""
        contacto_actualizado = False
        prospecto_creado = False
        cliente_ya_existia = False

        estado_asignado_id = await self._get_estado_contacto_id('ASIGNADO')
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')
        estado_gestionado_id = await self._get_estado_contacto_id('GESTIONADO')
        estado_prospecto_id = await self._get_estado_cliente_id('PROSPECTO')
        origen_manual_id = await self._get_origen_cliente_id('MANUAL')
        
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
            if data.nombre:
                contacto_existente.nombre = data.nombre
            if data.cargo:
                contacto_existente.cargo = data.cargo
            if getattr(data, 'email', None):
                contacto_existente.correo = data.email
            contacto_existente.updated_at = func.now()
            
            if contacto_existente.estado_id == estado_disponible_id:
                contacto_existente.estado_id = estado_asignado_id
                self.db.add(HistorialLlamada(
                    contacto_id=contacto_existente.id, comercial_id=user_id,
                    caso_id=None, comentario=None, estado_id=estado_asignado_id
                ))
            
            contacto = contacto_existente
            contacto_actualizado = True
        else:
            contacto = ClienteContacto(
                ruc=data.ruc,
                nombre=data.nombre or "Sin nombre",
                cargo=data.cargo,
                telefono=data.telefono,
                correo=getattr(data, 'email', None),
                origen='MANUAL',
                is_active=True,
                estado_id=estado_asignado_id,
            )
            self.db.add(contacto)
            await self.db.flush()
            
            self.db.add(HistorialLlamada(
                contacto_id=contacto.id, comercial_id=user_id,
                caso_id=None, comentario=None, estado_id=estado_asignado_id
            ))
        
        # 3. Si crear_como_prospecto → crear Cliente automáticamente
        if getattr(data, 'crear_como_prospecto', False):
            cliente_existente = (await self.db.execute(
                select(Cliente).where(Cliente.ruc == data.ruc, Cliente.is_active == True)
            )).scalars().first()
            
            if cliente_existente:
                cliente_ya_existia = True
            else:
                rs_result = (await self.db.execute(
                    select(RegistroImportacion.razon_social).where(RegistroImportacion.ruc == data.ruc)
                )).scalar()
                self.db.add(Cliente(
                    ruc=data.ruc, razon_social=rs_result or data.nombre or "Sin razón social",
                    comercial_encargado_id=user_id, estado_id=estado_prospecto_id,
                    origen_id=origen_manual_id, proxima_fecha_contacto=func.now(),
                    is_active=True, created_by=user_id
                ))
                prospecto_creado = True
            
            contacto.estado_id = estado_gestionado_id
        
        await self.db.commit()
        await self.db.refresh(contacto)
        
        rs_result = (await self.db.execute(
            select(RegistroImportacion.razon_social).where(RegistroImportacion.ruc == data.ruc)
        )).scalar()
        if not rs_result:
            rs_result = (await self.db.execute(
                select(Cliente.razon_social).where(Cliente.ruc == data.ruc)
            )).scalar()

        estado_final = "ASIGNADO" if contacto.estado_id == estado_asignado_id else "GESTIONADO"
        
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
            "estado": estado_final,
            "fecha_asignacion": contacto.created_at,
            "completado": False,
            "actualizado": contacto_actualizado,
            "prospecto_creado": prospecto_creado,
            "cliente_ya_existia": cliente_ya_existia
        }

