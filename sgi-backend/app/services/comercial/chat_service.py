from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, update, func, case, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime, timedelta
from typing import List, Optional

from app.models.chat_message import ChatMessage
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario
from app.schemas.comercial.chat import ChatMessageBase, ChatMessageCreate
from app.core.query_helpers import aplicar_filtro_comercial
from app.services.comercial.historial_inbox_service import HistorialInboxService

class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_conversations(self, comercial_id: int):
        """Fetch all non-closed/discarded conversations for a specific commercial user."""
        latest_msg_sq = select(func.max(ChatMessage.created_at)).where(ChatMessage.inbox_id == Inbox.id).scalar_subquery()
        
        query = (
            select(Inbox)
            .where(
                and_(
                    Inbox.asignado_a == comercial_id
                )
            )
            .options(
                selectinload(Inbox.mensajes),
                selectinload(Inbox.usuario_asignado).selectinload(Usuario.empleado)
            )
            .order_by(
                case(
                    (latest_msg_sq == None, 1), 
                    else_=0
                ),
                latest_msg_sq.desc()
            )
        )
        result = await self.db.execute(query)
        inboxes = result.scalars().all()
        
        previews = []
        for ibx in inboxes:
            unread = sum(1 for m in ibx.mensajes if m.direccion == 'ENTRANTE' and not m.leido)
            sorted_msgs = sorted(ibx.mensajes, key=lambda x: x.created_at, reverse=True)
            latest = sorted_msgs[0] if sorted_msgs else None
            
            latest_msg = None
            ultimo_mensaje_at = None
            if latest:
                ultimo_mensaje_at = latest.created_at
                if latest.tipo_contenido == 'image':
                    latest_msg = '📷 Imagen'
                elif latest.tipo_contenido in ('document', 'audio', 'video'):
                    latest_msg = f'📎 {latest.tipo_contenido.capitalize()}'
                else:
                    latest_msg = latest.contenido
            
            ventana = self._calcular_ventana_abierta(ibx)
            
            previews.append({
                "inbox_id": ibx.id,
                "telefono": ibx.telefono,
                "nombre_whatsapp": ibx.nombre_whatsapp,
                "estado": ibx.estado,
                "ultimo_mensaje_at": ultimo_mensaje_at,
                "mensajes_no_leidos": unread,
                "ultimo_mensaje_preview": latest_msg[:50] + "..." if latest_msg and len(latest_msg) > 50 else latest_msg,
                "asignado_a": ibx.asignado_a,
                "nombre_asignado": await self._get_nombre_asignado(ibx.asignado_a),
                "ventana_abierta": ventana,
                "gestion_celular": ibx.gestion_celular
            })
        return previews

    async def get_all_conversations(
        self, 
        comercial_ids: list = None, 
        filtro_comercial_id: int = None, 
        incluir_sin_asignar: bool = False,
        jefe_empleado_ids: list = None
    ):
        """Fetch all conversations, optionally filtered by team."""
        latest_msg_sq = select(func.max(ChatMessage.created_at)).where(ChatMessage.inbox_id == Inbox.id).scalar_subquery()
        
        query = (
            select(Inbox)
            # .where(Inbox.estado.not_in(['CERRADO']))
            .options(
                selectinload(Inbox.mensajes),
                selectinload(Inbox.usuario_asignado).selectinload(Usuario.empleado)
            )
            .order_by(
                case(
                    (latest_msg_sq == None, 1), 
                    else_=0
                ),
                latest_msg_sq.desc()
            )
        )
        
        query = await aplicar_filtro_comercial(
            query, Inbox.asignado_a, self.db,
            comercial_ids=comercial_ids,
            filtro_comercial_id=filtro_comercial_id,
            incluir_sin_asignar=incluir_sin_asignar,
            jefe_empleado_ids=jefe_empleado_ids
        )
        if query is None:
            return []
            
        result = await self.db.execute(query)
        inboxes = result.scalars().all()
        
        previews = []
        for ibx in inboxes:
            unread = sum(1 for m in ibx.mensajes if m.direccion == 'ENTRANTE' and not m.leido)
            sorted_msgs = sorted(ibx.mensajes, key=lambda x: x.created_at, reverse=True)
            latest = sorted_msgs[0] if sorted_msgs else None
            
            latest_msg = None
            ultimo_mensaje_at = None
            if latest:
                ultimo_mensaje_at = latest.created_at
                if latest.tipo_contenido == 'image':
                    latest_msg = '📷 Imagen'
                elif latest.tipo_contenido in ('document', 'audio', 'video'):
                    latest_msg = f'📎 {latest.tipo_contenido.capitalize()}'
                else:
                    latest_msg = latest.contenido
            
            ventana = self._calcular_ventana_abierta(ibx)
            
            previews.append({
                "inbox_id": ibx.id,
                "telefono": ibx.telefono,
                "nombre_whatsapp": ibx.nombre_whatsapp,
                "estado": ibx.estado,
                "ultimo_mensaje_at": ultimo_mensaje_at,
                "mensajes_no_leidos": unread,
                "ultimo_mensaje_preview": latest_msg[:50] + "..." if latest_msg and len(latest_msg) > 50 else latest_msg,
                "asignado_a": ibx.asignado_a,
                "nombre_asignado": await self._get_nombre_asignado(ibx.asignado_a),
                "ventana_abierta": ventana,
                "gestion_celular": ibx.gestion_celular
            })
        return previews

    def _calcular_ventana_abierta(self, inbox) -> bool:
        """Calcula si la ventana de 24h de WhatsApp sigue abierta usando los mensajes."""
        entrantes = sorted([m for m in inbox.mensajes if m.direccion == 'ENTRANTE'], key=lambda x: x.created_at, reverse=True)
        if not entrantes:
            # Si no hay mensajes entrantes de cliente, revisamos si acabamos de enviar nosotros y si eso cuenta, pero
            # por regla de META se basa en el mensaje del cliente.
            return False
            
        ref = entrantes[0].created_at
        if ref.tzinfo:
            ref = ref.replace(tzinfo=None)
        return (datetime.now() - ref).total_seconds() < 86400

    async def _get_nombre_asignado(self, usuario_id: int | None) -> str | None:
        """Obtiene el nombre del usuario asignado via JOIN."""
        if not usuario_id:
            return None
        from app.models.administrativo import Empleado
        stmt = select(func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno))\
            .join(Usuario, Usuario.empleado_id == Empleado.id)\
            .where(Usuario.id == usuario_id)
        result = await self.db.execute(stmt)
        return result.scalar()

    async def get_messages(self, inbox_id: int):
        """Get history of messages for a specific conversation."""
        query = select(ChatMessage).where(ChatMessage.inbox_id == inbox_id).order_by(ChatMessage.created_at.asc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def save_message(self, msg_in: ChatMessageCreate) -> ChatMessage:
        """Save a new message to the database."""
        db_msg = ChatMessage(
            inbox_id=msg_in.inbox_id,
            direccion=msg_in.direccion,
            remitente_tipo=msg_in.remitente_tipo,
            remitente_id=msg_in.remitente_id,
            contenido=msg_in.contenido,
            tipo_contenido=msg_in.tipo_contenido,
            media_url=msg_in.media_url,
            whatsapp_msg_id=msg_in.whatsapp_msg_id,
            estado_envio=msg_in.estado_envio,
            leido=False if msg_in.direccion == 'ENTRANTE' else True
        )
        self.db.add(db_msg)
        
        inbox = await self.db.get(Inbox, msg_in.inbox_id)
        if inbox:
            historial_svc = HistorialInboxService(self.db)
            
            # Si el cliente escribe en un lead cerrado, el bot lo reactiva
            if msg_in.direccion == 'ENTRANTE':
                # Si el cliente vuelve a hablar, se reinicia el flag celular ya que la ventana 24h se reabre
                if inbox.gestion_celular:
                    inbox.gestion_celular = False
                if inbox.ultimo_estado == 'CERRADO':
                    await historial_svc.registrar_cambio(inbox.id, 'BOT')
                    
            # Si el comercial responde, se pasa a EN_GESTION automáticamente si no lo estaba
            if msg_in.direccion == 'SALIENTE' and msg_in.remitente_tipo == 'COMERCIAL':
                if inbox.ultimo_estado in ['BOT', 'NUEVO', 'PENDIENTE']:
                    await historial_svc.registrar_cambio(inbox.id, 'EN_GESTION')
                
                # Destruir sesión activa del bot (usar inbox_id)
                from app.services.comercial.chatbot_service import ChatbotService
                bot_svc = ChatbotService(self.db)
                session = await bot_svc._get_active_session(inbox.id)
                if session:
                    await bot_svc._delete_session(session)
        
        await self.db.commit()
        await self.db.refresh(db_msg)
        return db_msg

    async def mark_as_read(self, inbox_id: int):
        """Mark all unread incoming messages as read."""
        stmt = (
            update(ChatMessage)
            .where(
                and_(
                    ChatMessage.inbox_id == inbox_id,
                    ChatMessage.direccion == 'ENTRANTE',
                    ChatMessage.leido == False
                )
            )
            .values(leido=True)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def take_chat(self, inbox_id: int, user_id: int):
        """Switch conversation control to ASESOR (estado EN_GESTION)."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        if inbox.ultimo_estado in ['BOT', 'NUEVO', 'PENDIENTE']:
            historial_svc = HistorialInboxService(self.db)
            await historial_svc.registrar_cambio(inbox.id, 'EN_GESTION')
            
            # Limpiar sesión del bot
            from app.services.comercial.chatbot_service import ChatbotService
            bot_svc = ChatbotService(self.db)
            session = await bot_svc._get_active_session(inbox.id)
            if session:
                await bot_svc._delete_session(session)
                
        await self.db.commit()
        return inbox

    async def release_chat(self, inbox_id: int):
        """Devolver control al bot."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        historial_svc = HistorialInboxService(self.db)
        await historial_svc.registrar_cambio(inbox.id, 'BOT')
        
        return inbox

    async def change_estado(self, inbox_id: int, nuevo_estado: str):
        """Cambiar estado manualmente."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        valid_states = ['BOT', 'NUEVO', 'PENDIENTE', 'EN_GESTION', 'COTIZADO', 'CERRADO', 'DESCARTADO']
        if nuevo_estado not in valid_states:
            raise HTTPException(status_code=400, detail="Estado no válido")
            
        if inbox.ultimo_estado != nuevo_estado:
            historial_svc = HistorialInboxService(self.db)
            await historial_svc.registrar_cambio(inbox.id, nuevo_estado)
            await self.db.commit()
            await self.db.refresh(inbox)
            
        return inbox

    async def marcar_gestion_celular(self, inbox_id: int) -> Inbox:
        """Marca un lead como gestionado por el celular corporativo."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        inbox.gestion_celular = True
        
        historial_svc = HistorialInboxService(self.db)
        await historial_svc.registrar_cambio(
            inbox_id=inbox.id, 
            estado_nuevo=inbox.ultimo_estado, 
            estado_anterior=inbox.ultimo_estado,
            comentario="Confirmada atención desde celular corporativo"
        )
        
        await self.db.commit()
        await self.db.refresh(inbox)
        return inbox
