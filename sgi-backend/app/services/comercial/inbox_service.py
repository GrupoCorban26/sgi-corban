from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario, Rol, usuarios_roles
from app.models.comercial import Cliente, ClienteContacto
from app.schemas.comercial.inbox import InboxDistribute
from datetime import datetime

class InboxService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def distribute_lead(self, data: InboxDistribute):
        # 1. Normalize phone (remove +51, spaces)
        phone = data.telefono.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]
            
        # 2. Check if already exists in Inbox (PENDIENTE)
        query_inbox = select(Inbox).where(and_(Inbox.telefono.like(f"%{phone}%"), Inbox.estado == 'PENDIENTE'))
        result_inbox = await self.db.execute(query_inbox)
        existing_inbox = result_inbox.scalars().first()
        
        if existing_inbox:
            # Return existing assignment
            query_user = select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == existing_inbox.asignado_a)
            result_user = await self.db.execute(query_user)
            user = result_user.scalar_one_or_none()
            return self._format_response(existing_inbox, user)

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
            query_users = select(Usuario).join(Usuario.roles).where(
                and_(
                    Rol.nombre == 'COMERCIAL',
                    Usuario.is_active == True
                )
            ).options(selectinload(Usuario.empleado))
            
            result_users = await self.db.execute(query_users)
            commercials = result_users.scalars().all()
            
            if not commercials:
                raise Exception("No active commercials found")
            
            # Round-Robin: Find the last assigned commercial and pick the next one
            commercials_sorted = sorted(commercials, key=lambda u: u.id)
            
            # Get the most recently assigned lead
            last_assigned_query = select(Inbox).order_by(Inbox.id.desc()).limit(1)
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
        
        # 5. Create Inbox Entry
        new_lead = Inbox(
            telefono=phone,
            mensaje_inicial=data.mensaje,
            nombre_whatsapp=data.nombre_display,
            asignado_a=assigned_user.id,
            estado='PENDIENTE',
            tipo_interes=data.tipo_interes,
        )
        self.db.add(new_lead)
        await self.db.commit()
        await self.db.refresh(new_lead)
        
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
            selectinload(Inbox.usuario_asignado).selectinload(Usuario.empleado)
        ).order_by(Inbox.fecha_recepcion.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all_leads(self):
        query = select(Inbox).where(
            Inbox.estado == 'PENDIENTE'
        ).options(
            selectinload(Inbox.usuario_asignado).selectinload(Usuario.empleado)
        ).order_by(Inbox.fecha_recepcion.desc())
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

    async def get_all_pending_count(self) -> int:
        query = select(func.count()).select_from(Inbox).where(
            Inbox.estado == 'PENDIENTE'
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def convert_lead(self, lead_id: int, client_id: int):
        lead = await self.db.get(Inbox, lead_id)
        if lead:
            lead.estado = 'CONVERTIDO'
            lead.fecha_gestion = datetime.now()
            await self.db.commit()
            return True
        return False

    async def discard_lead(self, lead_id: int):
        lead = await self.db.get(Inbox, lead_id)
        if lead:
            lead.estado = 'DESCARTADO'
            lead.fecha_gestion = datetime.now()
            await self.db.commit()
            return True
        return False
