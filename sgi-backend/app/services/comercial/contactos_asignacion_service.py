"""
ContactosAsignacionService - Lógica de asignación de leads y feedback.
Responsabilidad única: asignar leads a comerciales, gestionar feedback y crear clientes.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_, update
from fastapi import HTTPException
from app.models.comercial import ClienteContacto, Cliente, CasoLlamada, RegistroImportacion


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
    
    async def cargar_base(self, user_id: int, pais_origen: list = None, partida_arancelaria: list = None):
        """
        Lógica de asignación de lotes con TRANSACCIÓN EXPLÍCITA.
        1. Verifica que no haya leads sin guardar.
        2. Marca gestionados.
        3. Selecciona nuevas empresas.
        4. Asigna.
        """
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
        
        # TRANSACCIÓN EXPLÍCITA para garantizar atomicidad
        async with self.db.begin_nested():
            # 2. Marcar contactos anteriores como GESTIONADO
            stmt_update_prev = update(ClienteContacto).where(
                ClienteContacto.asignado_a == user_id,
                ClienteContacto.estado == 'ASIGNADO',
                ClienteContacto.is_active == True,
                ClienteContacto.fecha_llamada.isnot(None)
            ).values(estado='GESTIONADO')
            await self.db.execute(stmt_update_prev)
            
            # 3. Obtener RUCs disponibles
            stmt_excluded = select(ClienteContacto.ruc).where(
                ClienteContacto.estado.in_(['EN_GESTION', 'ASIGNADO']),
                ClienteContacto.is_active == True
            ).distinct()
            
            stmt_clients = select(Cliente.ruc).where(Cliente.ruc.isnot(None))
            
            stmt_rucs = select(ClienteContacto.ruc).join(
                RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc
            ).where(
                ClienteContacto.is_client == False,
                ClienteContacto.is_active == True,
                ClienteContacto.estado == 'DISPONIBLE',
                ClienteContacto.ruc.notin_(stmt_excluded),
                ClienteContacto.ruc.notin_(stmt_clients)
            )
                
            if pais_origen:
                conditions = [RegistroImportacion.paises_origen.like(f"%{p}%") for p in pais_origen]
                stmt_rucs = stmt_rucs.where(or_(*conditions))
            if partida_arancelaria:
                conditions_partida = [RegistroImportacion.partida_arancelaria_cod.like(f"%{p}%") for p in partida_arancelaria]
                stmt_rucs = stmt_rucs.where(or_(*conditions_partida))
                
            stmt_rucs = stmt_rucs.group_by(ClienteContacto.ruc).order_by(func.newid()).limit(50)
            
            rucs_disponibles = (await self.db.execute(stmt_rucs)).scalars().all()
            
            if not rucs_disponibles:
                return {"success": True, "contactos": [], "cantidad": 0, "message": "No hay más leads disponibles con esos filtros."}
                
            # 4. Asignar UN contacto por RUC
            for ruc in rucs_disponibles:
                stmt_one = select(ClienteContacto).where(
                    ClienteContacto.ruc == ruc, 
                    ClienteContacto.estado == 'DISPONIBLE',
                    ClienteContacto.is_active == True
                ).limit(1)
                contact = (await self.db.execute(stmt_one)).scalars().first()
                
                if contact:
                    contact.asignado_a = user_id
                    contact.fecha_asignacion = func.now()
                    contact.lote_asignacion = (contact.lote_asignacion or 0) + 1
                    contact.estado = 'ASIGNADO'
                    contact.caso_id = None
                    contact.comentario = None
                    contact.fecha_llamada = None
                    
                # 5. Marcar otros de ese RUC como EN_GESTION
                stmt_others = update(ClienteContacto).where(
                    ClienteContacto.ruc == ruc,
                    ClienteContacto.estado == 'DISPONIBLE',
                    ClienteContacto.is_active == True
                ).values(estado='EN_GESTION')
                await self.db.execute(stmt_others)
        
        await self.db.commit()
        
        # Obtener contactos asignados y devolver con cantidad
        contactos = await self.get_mis_contactos_asignados(user_id)
        return {"contactos": contactos, "cantidad": len(contactos)}

    async def assign_leads_batch(self, user_id: int):
        """Asigna contactos a un comercial siguiendo la lógica de lotes y empresas únicas."""
        return await self.cargar_base(user_id)
    
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
                contact.is_client = True
                 
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
                # Mark current as GESTIONADO (already done implicitly by flow, but state was updated above?) 
                # Wait, contact state is updated where? Ah, explicitly set to GESTIONADO if created client. 
                # If NOT created client, current contact should ALSO be GESTIONADO?
                # The original code only updated contact state if client was created? 
                # Line 222-226 logic marks 'EN_GESTION' -> 'GESTIONADO'.
                
                # Let's ensure current contact is marked GESTIONADO regardless of outcome, 
                # provided it was the one being acted upon. 
                # Actually, the requirement says: "los demás registros de ese mismo ruc pasan a disponible".
                
                contact.estado = 'GESTIONADO' # Always mark current one as handled
                
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
        """Obtiene países y partidas disponibles para filtrar."""
        # Queries for distinct values using raw SQL for STRING_SPLIT (MSSQL specific)
        paises_result = await self.db.execute(text("""
            SELECT TOP 50 
                TRIM(value) as pais,
                COUNT(*) as cantidad
            FROM comercial.registro_importaciones
            CROSS APPLY STRING_SPLIT(REPLACE(paises_origen, '|', ','), ',')
            WHERE TRIM(value) != ''
            GROUP BY TRIM(value)
            ORDER BY COUNT(*) DESC
        """))
        paises = [{"pais": row[0], "cantidad": row[1]} for row in paises_result.fetchall()]
        
        partidas_result = await self.db.execute(text("""
            SELECT TOP 50 
                LEFT(TRIM(value), 4) as partida,
                COUNT(*) as cantidad
            FROM comercial.registro_importaciones
            CROSS APPLY STRING_SPLIT(partida_arancelaria_cod, ',')
            WHERE TRIM(value) != ''
            GROUP BY LEFT(TRIM(value), 4)
            ORDER BY COUNT(*) DESC
        """))
        partidas = [{"partida": row[0], "cantidad": row[1]} for row in partidas_result.fetchall()]
        
        return {"paises": paises, "partidas": partidas}

    async def create_contacto_manual(self, data, user_id: int):
        """Crea un contacto manual y lo asigna inmediatamente al comercial."""
        # 1. Validar duplicado (RUC + Telefono) para evitar conflictos obvios
        stmt_dup = select(ClienteContacto).where(
            ClienteContacto.ruc == data.ruc,
            ClienteContacto.telefono == data.telefono,
            ClienteContacto.is_active == True
        )
        if (await self.db.execute(stmt_dup)).scalars().first():
            raise HTTPException(400, "Ya existe un contacto activo con este RUC y teléfono.")

        # 2. Crear contacto asignado
        nuevo_contacto = ClienteContacto(
            ruc=data.ruc,
            nombre=data.nombre,
            cargo=data.cargo,
            telefono=data.telefono,
            correo=data.email,
            origen='MANUAL',
            is_client=False,
            is_active=True,
            estado='ASIGNADO',
            asignado_a=user_id,
            fecha_asignacion=func.now(),
            lote_asignacion=0 # 0 para manuales
        )
        self.db.add(nuevo_contacto)
        await self.db.commit()
        await self.db.refresh(nuevo_contacto)
        
        # Devolver estructura similar a get_mis_contactos_asignados para facilitar frontend
        # Recuperar Razón Social si existe
        stmt_rs = select(
            RegistroImportacion.razon_social,
            Cliente.razon_social
        ).outerjoin(Cliente, RegistroImportacion.ruc == Cliente.ruc).where(RegistroImportacion.ruc == data.ruc)
        
        # Intentar obtener razon social de alguna fuente
        # Es mas seguro hacer una query aparte o reusar logica
        rs_result = (await self.db.execute(select(RegistroImportacion.razon_social).where(RegistroImportacion.ruc == data.ruc))).scalar()
        if not rs_result:
             rs_result = (await self.db.execute(select(Cliente.razon_social).where(Cliente.ruc == data.ruc))).scalar()
        
        return {
            "id": nuevo_contacto.id,
            "ruc": nuevo_contacto.ruc,
            "nombre": nuevo_contacto.nombre,
            "razon_social": rs_result or "Sin razón social",
            "telefono": nuevo_contacto.telefono,
            "correo": nuevo_contacto.correo,
            "cargo": nuevo_contacto.cargo,
            "contesto": 0,
            "caso_id": None,
            "caso_nombre": None,
            "comentario": None,
            "estado": nuevo_contacto.estado,
            "fecha_asignacion": nuevo_contacto.fecha_asignacion,
            "fecha_llamada": None,
            "is_client": False
        }

