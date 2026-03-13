import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, update
from sqlalchemy.orm import selectinload
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario, Rol, usuarios_roles
from app.models.comercial import Cliente, ClienteContacto
from app.models.administrativo import Empleado, EmpleadoActivo, Activo, LineaCorporativa
from app.schemas.comercial.inbox import InboxDistribute
from app.utils.horario_laboral import calcular_segundos_horario_laboral
from app.core.query_helpers import aplicar_filtro_comercial
from datetime import datetime

# Lock global para prevenir condiciones de carrera en el Round Robin
_round_robin_lock = asyncio.Lock()


class InboxService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def distribute_lead(self, data: InboxDistribute):
        # 1. Normalize phone (remove +51, spaces)
        phone = data.telefono.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]
            
        # 2. Check if already exists in Inbox (PENDIENTE or NUEVO)
        query_inbox = select(Inbox).where(
            and_(
                Inbox.telefono.like(f"%{phone}%"), 
                Inbox.estado.in_(['PENDIENTE', 'NUEVO'])
            )
        ).order_by(Inbox.id.desc())
        result_inbox = await self.db.execute(query_inbox)
        existing_inbox = result_inbox.scalars().first()
        
        if existing_inbox:
            if existing_inbox.estado == 'PENDIENTE':
                # Return existing assignment if already assigned
                query_user = select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == existing_inbox.asignado_a)
                result_user = await self.db.execute(query_user)
                user = result_user.scalar_one_or_none()
                return self._format_response(existing_inbox, user)
            # If it's NUEVO, we will just assign it below instead of creating a new one

        # 3. Check if exists in Clientes or ClienteContactos
        # Buscar en Contactos primero
        query_contacto = select(ClienteContacto).where(and_(ClienteContacto.telefono.like(f"%{phone}%"), ClienteContacto.is_active == True))
        result_contacto = await self.db.execute(query_contacto)
        contacto = result_contacto.scalars().first()

        assigned_user = None
        is_existing_client = False

        if contacto:
            pass # (Logic remains same as previous step, just skipping for brevity in diff if not changed)
        
        # ... (Same logic for finding client)

        if contacto and contacto.ruc:
            is_existing_client = True
            query_cliente = select(Cliente).where(Cliente.ruc == contacto.ruc)
            result_cliente = await self.db.execute(query_cliente)
            cliente = result_cliente.scalars().first()
            
            if cliente and cliente.comercial_encargado_id:
                # Eager load assigned commercial
                query_assigned = select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == cliente.comercial_encargado_id)
                result_assigned = await self.db.execute(query_assigned)
                assigned_user = result_assigned.scalar_one_or_none()

        if not assigned_user:
            # 4. New Lead or Unassigned Client: Assign via Round-Robin
            # Lock para prevenir que dos clientes concurrentes obtengan el mismo comercial
            async with _round_robin_lock:
                # Obtener todos los comerciales activos
                query_users = select(Usuario).join(Usuario.roles).where(
                    and_(
                        Rol.nombre == 'COMERCIAL',
                        Usuario.is_active == True
                    )
                ).options(selectinload(Usuario.empleado))
                
                result_users = await self.db.execute(query_users)
                all_commercials = result_users.scalars().all()
                
                if not all_commercials:
                    raise Exception("No active commercials found")
                
                # Filtrar comerciales por JEFE_COMERCIAL si está configurado en .env
                import os
                bot_jefe_id_str = os.getenv("BOT_JEFE_COMERCIAL_ID")
                if bot_jefe_id_str:
                    try:
                        jefe_id_val = int(bot_jefe_id_str)
                        # Filtrar dejando רק a los comerciales cuyo jefe_id en su Empleado coincida
                        filtered_commercials = [c for c in all_commercials if c.empleado and c.empleado.jefe_id == jefe_id_val]
                        
                        if filtered_commercials:
                            all_commercials = filtered_commercials
                        else:
                            import logging
                            logging.getLogger(__name__).warning(
                                f"No se encontraron comerciales activos bajo el jefe_id={jefe_id_val}. Fallback a todos los comerciales."
                            )
                    except ValueError:
                        pass
                
                # Filtrar solo los disponibles en buzón
                disponibles = [c for c in all_commercials if c.disponible_buzon]
                
                # Fallback: si nadie está disponible, asignar al que tenga menos leads pendientes
                if not disponibles:
                    import logging
                    logging.getLogger(__name__).warning(
                        "No hay comerciales disponibles en buzón. Usando fallback: comercial con menos leads."
                    )
                    # Contar leads pendientes por comercial
                    counts = {}
                    for c in all_commercials:
                        count_query = select(func.count()).select_from(Inbox).where(
                            and_(Inbox.asignado_a == c.id, Inbox.estado == 'PENDIENTE')
                        )
                        result_count = await self.db.execute(count_query)
                        counts[c.id] = result_count.scalar() or 0
                    
                    # Ordenar por menor cantidad de leads pendientes
                    all_commercials_sorted = sorted(all_commercials, key=lambda c: counts[c.id])
                    assigned_user = all_commercials_sorted[0]
                else:
                    # Round-Robin normal entre los disponibles
                    commercials_sorted = sorted(disponibles, key=lambda u: u.id)
                    
                    # Get the most recently assigned lead (must have an assignee)
                    last_assigned_query = select(Inbox).where(
                        Inbox.asignado_a.isnot(None)
                    ).order_by(Inbox.id.desc()).limit(1)
                    last_result = await self.db.execute(last_assigned_query)
                    last_lead = last_result.scalar_one_or_none()
                    
                    if last_lead and last_lead.asignado_a:
                        # Find the index of the last assigned commercial
                        commercial_ids = [c.id for c in commercials_sorted]
                        if last_lead.asignado_a in commercial_ids:
                            last_index = commercial_ids.index(last_lead.asignado_a)
                            next_index = (last_index + 1) % len(commercials_sorted)
                        else:
                            next_index = 0
                        assigned_user = commercials_sorted[next_index]
                    else:
                        assigned_user = commercials_sorted[0]
        
        # 5. Create or Update Inbox Entry
        if existing_inbox and existing_inbox.estado == 'NUEVO':
            new_lead = existing_inbox
            new_lead.asignado_a = assigned_user.id
            new_lead.estado = 'PENDIENTE'
            new_lead.fecha_asignacion = datetime.now()
            new_lead.tiempo_respuesta_segundos = None
            new_lead.fecha_primera_respuesta = None
            new_lead.tipo_interes = data.tipo_interes
            # Update the original message if None or generic
            if not new_lead.mensaje_inicial or new_lead.mensaje_inicial == "Interacción inicial":
                new_lead.mensaje_inicial = data.mensaje
        else:
            new_lead = Inbox(
                telefono=phone,
                mensaje_inicial=data.mensaje,
                nombre_whatsapp=data.nombre_display,
                asignado_a=assigned_user.id,
                fecha_asignacion=datetime.now(),
                estado='PENDIENTE',
                tipo_interes=data.tipo_interes,
            )
            self.db.add(new_lead)
            
        await self.db.commit()
        await self.db.refresh(new_lead)
        
        # Notificar al comercial de la asignación
        try:
            from app.services.notificacion_service import NotificacionService
            notif_svc = NotificacionService(self.db)
            nombre_lead = data.nombre_display or phone
            await notif_svc.notificar_lead_asignado(
                comercial_id=assigned_user.id,
                nombre_lead=nombre_lead,
                telefono=phone,
                inbox_id=new_lead.id
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"No se pudo crear notificación: {e}")
        
        return self._format_response(new_lead, assigned_user, is_existing_client)

    def _format_response(self, lead, user, is_existing_client=False):
        user_phone = user.empleado.celular if user.empleado else None
        return {
            "lead_id": lead.id,
            "is_existing_client": is_existing_client,
            "assigned_to": {
                "id": user.id,
                "nombre": f"{user.empleado.nombres} {user.empleado.apellido_paterno}" if user.empleado else user.correo_corp,
                "whatsapp": user_phone
            }
        }

    async def get_my_leads(self, user_id: int):
        query = select(Inbox).where(
            and_(
                Inbox.asignado_a == user_id,
                Inbox.estado == 'PENDIENTE'
            )
        ).options(
            selectinload(Inbox.usuario_asignado)
                .selectinload(Usuario.empleado)
                .selectinload(Empleado.activos_asignados)
                .selectinload(EmpleadoActivo.activo)
                .selectinload(Activo.linea_instalada)
        ).order_by(Inbox.fecha_recepcion.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all_leads(self, comercial_ids: list = None, filtro_comercial_id: int = None):
        query = select(Inbox).where(
            Inbox.estado == 'PENDIENTE'
        ).options(
            selectinload(Inbox.usuario_asignado)
                .selectinload(Usuario.empleado)
                .selectinload(Empleado.activos_asignados)
                .selectinload(EmpleadoActivo.activo)
                .selectinload(Activo.linea_instalada)
        )
        
        query = await aplicar_filtro_comercial(
            query, Inbox.asignado_a, self.db,
            comercial_ids=comercial_ids,
            filtro_comercial_id=filtro_comercial_id,
            incluir_sin_asignar=True
        )
        if query is None:
            return []
            
        query = query.order_by(Inbox.fecha_recepcion.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_pending_count(self, user_id: int) -> int:
        query = select(func.count()).select_from(Inbox).where(
            and_(
                Inbox.asignado_a == user_id,
                Inbox.estado == 'PENDIENTE'
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_all_pending_count(self, comercial_ids: list = None, filtro_comercial_id: int = None) -> int:
        query = select(func.count()).select_from(Inbox).where(
            Inbox.estado == 'PENDIENTE'
        )
        
        query = await aplicar_filtro_comercial(
            query, Inbox.asignado_a, self.db,
            comercial_ids=comercial_ids,
            filtro_comercial_id=filtro_comercial_id,
            incluir_sin_asignar=True
        )
        if query is None:
            return 0
            
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def convert_lead(self, lead_id: int, client_id: int):
        lead = await self.db.get(Inbox, lead_id)
        if lead:
            lead.estado = 'CIERRE'
            lead.modo = 'BOT'
            lead.fecha_gestion = datetime.now()
            
            # Calcular y guardar tiempo de respuesta si existe fecha de asignación o recepción
            base_date = lead.fecha_asignacion or lead.fecha_recepcion
            if base_date and not lead.tiempo_respuesta_segundos:
                base_date_naive = base_date.replace(tzinfo=None) if base_date.tzinfo else base_date
                lead.tiempo_respuesta_segundos = calcular_segundos_horario_laboral(
                    base_date_naive, datetime.now()
                )
            
            # Trazabilidad: vincular el cliente con su lead de origen
            cliente = None
            if client_id:
                cliente = await self.db.get(Cliente, client_id)
                if cliente:
                    cliente.inbox_origen_id = lead_id
                    if not cliente.origen:
                        cliente.origen = "WHATSAPP"
                        
            # Crear ClienteContacto principal con el teléfono del lead
            if cliente and cliente.ruc and lead.telefono:
                phone = lead.telefono.replace(" ", "").replace("+", "")
                if phone.startswith("51"):
                    phone = phone[2:]
                
                existing_contact = await self.db.execute(
                    select(ClienteContacto).where(
                        and_(
                            ClienteContacto.ruc == cliente.ruc,
                            ClienteContacto.telefono.like(f"%{phone}%"),
                            ClienteContacto.is_active == True
                        )
                    )
                )
                contacto_existente = existing_contact.scalars().first()
                
                # Desmarcar temporalmente cualquier otro como principal para este ruc si vamos a asentar este
                await self.db.execute(
                    update(ClienteContacto).where(
                        ClienteContacto.ruc == cliente.ruc
                    ).values(is_principal=False)
                )
                
                if contacto_existente:
                    contacto_existente.is_client = True
                    contacto_existente.is_principal = True
                else:
                    nuevo_contacto = ClienteContacto(
                        ruc=cliente.ruc,
                        nombre=lead.nombre_whatsapp or "Contacto WhatsApp",
                        telefono=phone,
                        origen='WHATSAPP',
                        is_client=True,
                        is_active=True,
                        is_principal=True,
                        estado='GESTIONADO',
                        asignado_a=lead.asignado_a,
                        fecha_asignacion=datetime.now(),
                        fecha_llamada=datetime.now(),
                        lote_asignacion=0
                    )
                    self.db.add(nuevo_contacto)
            
            await self.db.commit()
            return True
        return False

    async def discard_lead(self, lead_id: int, request_data: dict = None):
        lead = await self.db.get(Inbox, lead_id)
        if lead:
            lead.estado = 'DESCARTADO'
            lead.modo = 'BOT'
            lead.fecha_gestion = datetime.now()
            
            if request_data:
                lead.motivo_descarte = request_data.get('motivo_descarte')
                lead.comentario_descarte = request_data.get('comentario_descarte')
                
            # Iniciar flujo interactivo de despedida
            from app.services.comercial.chatbot_service import ChatbotService
            bot_svc = ChatbotService(self.db)
            await bot_svc.initiate_post_atencion(lead.telefono, lead.id)
                
            await self.db.commit()
            return True
        return False

    async def registrar_primera_respuesta(self, lead_id: int):
        """Registra la primera respuesta del comercial y calcula el tiempo de respuesta."""
        lead = await self.db.get(Inbox, lead_id)
        if lead and not lead.fecha_primera_respuesta:
            lead.fecha_primera_respuesta = datetime.now()
            base_date = lead.fecha_asignacion or lead.fecha_recepcion
            if base_date:
                base_date_naive = base_date.replace(tzinfo=None) if base_date.tzinfo else base_date
                lead.tiempo_respuesta_segundos = calcular_segundos_horario_laboral(
                    base_date_naive, datetime.now()
                )
            await self.db.commit()
            return True
        return False

    async def escalar_a_directo(self, lead_id: int) -> bool:
        """Marca que el comercial compartió su número corporativo con el cliente."""
        lead = await self.db.get(Inbox, lead_id)
        if lead and not lead.escalado_a_directo:
            lead.escalado_a_directo = True
            lead.fecha_escalacion = datetime.now()
            await self.db.commit()
            return True
        return False

    async def asignar_manual(self, lead_id: int, comercial_id: int) -> dict:
        """Asigna manualmente un lead NUEVO a un comercial específico (sin enviar mensaje al cliente)."""
        from sqlalchemy.orm import selectinload
        from app.models.comercial_session import ConversationSession
        from sqlalchemy import and_, or_
        
        lead = await self.db.get(Inbox, lead_id)
        if not lead:
            raise Exception("Lead no encontrado")
        
        if lead.estado not in ('NUEVO', 'PENDIENTE'):
            raise Exception(f"Solo se pueden asignar leads en estado NUEVO o PENDIENTE (actual: {lead.estado})")
        
        # Verificar que el comercial existe y está activo
        query_user = select(Usuario).options(selectinload(Usuario.empleado)).where(
            and_(Usuario.id == comercial_id, Usuario.is_active == True)
        )
        result_user = await self.db.execute(query_user)
        user = result_user.scalar_one_or_none()
        if not user:
            raise Exception("Comercial no encontrado o inactivo")
        
        # Asignar el lead
        lead.asignado_a = comercial_id
        lead.estado = 'PENDIENTE'
        lead.fecha_asignacion = datetime.now()
        lead.modo = 'ASESOR'  # Para que el bot no interfiera
        
        if not lead.tipo_interes:
            lead.tipo_interes = 'ASIGNACION_MANUAL'
        
        # Limpiar sesiones del bot para este teléfono
        query_sessions = select(ConversationSession).where(
            ConversationSession.telefono.like(f"%{lead.telefono}%")
        )
        result_sessions = await self.db.execute(query_sessions)
        for session in result_sessions.scalars().all():
            await self.db.delete(session)
        
        await self.db.commit()
        await self.db.refresh(lead)
        
        nombre = f"{user.empleado.nombres} {user.empleado.apellido_paterno}" if user.empleado else user.correo_corp
        
        # Notificar al comercial de la asignación manual
        try:
            from app.services.notificacion_service import NotificacionService
            notif_svc = NotificacionService(self.db)
            nombre_lead = lead.nombre_whatsapp or lead.telefono
            await notif_svc.notificar_lead_asignado(
                comercial_id=comercial_id,
                nombre_lead=nombre_lead,
                telefono=lead.telefono,
                inbox_id=lead.id
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"No se pudo crear notificación: {e}")
        
        return {
            "lead_id": lead.id,
            "asignado_a": comercial_id,
            "nombre_asignado": nombre,
            "estado": lead.estado,
            "modo": lead.modo
        }
