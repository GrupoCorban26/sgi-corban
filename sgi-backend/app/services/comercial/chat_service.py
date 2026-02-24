from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, update, func, case
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime
from typing import List, Optional

from app.models.chat_message import ChatMessage
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario
from app.schemas.comercial.chat import ChatMessageCreate

class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_conversations(self, comercial_id: int):
        """Fetch all non-closed/discarded conversations for a specific commercial user."""
        # Join with ChatMessage to get latest message (can be done in app level or complex query)
        query = (
            select(Inbox)
            .where(
                and_(
                    Inbox.asignado_a == comercial_id,
                    Inbox.estado.not_in(['CIERRE', 'DESCARTADO', 'CONVERTIDO'])
                )
            )
            .options(
                selectinload(Inbox.mensajes)
            )
            .order_by(
                case(
                    (Inbox.ultimo_mensaje_at == None, 1), 
                    else_=0
                ),
                Inbox.ultimo_mensaje_at.desc()
            )
        )
        result = await self.db.execute(query)
        inboxes = result.scalars().all()
        
        previews = []
        for ibx in inboxes:
            # Count unread
            unread = sum(1 for m in ibx.mensajes if m.direccion == 'ENTRANTE' and not m.leido)
            # Latest message
            sorted_msgs = sorted(ibx.mensajes, key=lambda x: x.created_at, reverse=True)
            latest_msg = sorted_msgs[0].contenido if sorted_msgs else ibx.mensaje_inicial
            
            previews.append({
                "inbox_id": ibx.id,
                "telefono": ibx.telefono,
                "nombre_whatsapp": ibx.nombre_whatsapp,
                "estado": ibx.estado,
                "modo": ibx.modo,
                "ultimo_mensaje_at": ibx.ultimo_mensaje_at,
                "mensajes_no_leidos": unread,
                "ultimo_mensaje_preview": latest_msg[:50] + "..." if latest_msg and len(latest_msg) > 50 else latest_msg,
                "asignado_a": ibx.asignado_a
            })
        return previews

    async def get_all_conversations(self):
        """Fetch all conversations for Chiefs."""
        query = (
            select(Inbox)
            .where(
                Inbox.estado.not_in(['CIERRE', 'DESCARTADO', 'CONVERTIDO'])
            )
            .options(
                selectinload(Inbox.mensajes)
            )
            .order_by(
                case(
                    (Inbox.ultimo_mensaje_at == None, 1), 
                    else_=0
                ),
                Inbox.ultimo_mensaje_at.desc()
            )
        )
        result = await self.db.execute(query)
        inboxes = result.scalars().all()
        
        previews = []
        for ibx in inboxes:
            unread = sum(1 for m in ibx.mensajes if m.direccion == 'ENTRANTE' and not m.leido)
            sorted_msgs = sorted(ibx.mensajes, key=lambda x: x.created_at, reverse=True)
            latest_msg = sorted_msgs[0].contenido if sorted_msgs else ibx.mensaje_inicial
            
            previews.append({
                "inbox_id": ibx.id,
                "telefono": ibx.telefono,
                "nombre_whatsapp": ibx.nombre_whatsapp,
                "estado": ibx.estado,
                "modo": ibx.modo,
                "ultimo_mensaje_at": ibx.ultimo_mensaje_at,
                "mensajes_no_leidos": unread,
                "ultimo_mensaje_preview": latest_msg[:50] + "..." if latest_msg and len(latest_msg) > 50 else latest_msg,
                "asignado_a": ibx.asignado_a
            })
        return previews

    async def get_messages(self, inbox_id: int):
        """Get history of messages for a specific conversation."""
        query = select(ChatMessage).where(ChatMessage.inbox_id == inbox_id).order_by(ChatMessage.created_at.asc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def save_message(self, msg_in: ChatMessageCreate) -> ChatMessage:
        """Save a new message to the database."""
        db_msg = ChatMessage(
            inbox_id=msg_in.inbox_id,
            telefono=msg_in.telefono,
            direccion=msg_in.direccion,
            remitente_tipo=msg_in.remitente_tipo,
            remitente_id=msg_in.remitente_id,
            contenido=msg_in.contenido,
            whatsapp_msg_id=msg_in.whatsapp_msg_id,
            estado_envio=msg_in.estado_envio,
            leido=False if msg_in.direccion == 'ENTRANTE' else True
        )
        self.db.add(db_msg)
        
        # Update inbox ultimo_mensaje_at
        inbox = await self.db.get(Inbox, msg_in.inbox_id)
        if inbox:
            inbox.ultimo_mensaje_at = func.now()
            # If it's a new incoming message from client in a closed state, reopen it to NUEVO
            if msg_in.direccion == 'ENTRANTE' and inbox.estado in ['CIERRE', 'DESCARTADO', 'CONVERTIDO']:
                inbox.estado = 'NUEVO'
                inbox.modo = 'BOT' # Return to bot when reactivated 
            
            # Registrar primera respuesta del asesor si es SALIENTE
            if msg_in.direccion == 'SALIENTE' and not inbox.fecha_primera_respuesta:
                inbox.fecha_primera_respuesta = datetime.now()
                if inbox.fecha_recepcion:
                    inbox.tiempo_respuesta_minutos = int(
                        (datetime.now() - inbox.fecha_recepcion).total_seconds() / 60
                    )
        
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
        """Switch conversation mode to ASESOR and EN_GESTION."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        inbox.modo = 'ASESOR'
        if inbox.estado in ['NUEVO', 'PENDIENTE']:
            inbox.estado = 'EN_GESTION'
            
        await self.db.commit()
        return inbox

    async def release_chat(self, inbox_id: int):
        """Devolver al bot."""
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        inbox.modo = 'BOT'
        await self.db.commit()
        return inbox

    async def change_estado(self, inbox_id: int, nuevo_estado: str):
        inbox = await self.db.get(Inbox, inbox_id)
        if not inbox:
            raise HTTPException(status_code=404, detail="Inbox not found")
            
        valid_states = ['NUEVO', 'PENDIENTE', 'EN_GESTION', 'SEGUIMIENTO', 'COTIZADO', 'CIERRE', 'DESCARTADO']
        if nuevo_estado not in valid_states:
            raise HTTPException(status_code=400, detail="Estado no válido")
            
        inbox.estado = nuevo_estado
        if nuevo_estado in ['CIERRE', 'DESCARTADO']:
            inbox.modo = 'BOT'
            
        await self.db.commit()
        return inbox
