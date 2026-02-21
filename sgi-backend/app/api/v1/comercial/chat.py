from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from sqlalchemy import select
from app.models.seguridad import Usuario
from app.schemas.comercial.chat import (
    ChatMessageResponse, 
    SendMessageRequest,
    ChangeEstadoRequest,
    ChatConversationPreview,
    ChatMessageCreate
)
from app.services.comercial.chat_service import ChatService
from app.services.comercial.whatsapp_service import WhatsAppService

router = APIRouter()

async def get_current_user_obj(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_active_auth)
) -> Usuario:
    user_id = int(payload.get("sub"))
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

@router.get("/conversations", response_model=List[ChatConversationPreview])
async def get_conversations(
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Obtener todas las conversaciones activas para el comercial logueado."""
    chat_svc = ChatService(db)
    
    # Check if user is Jefe Comercial
    is_jefe = any(r.nombre == "JEFE_COMERCIAL" for r in current_user.roles)
    if is_jefe:
        return await chat_svc.get_all_conversations()
        
    return await chat_svc.get_conversations(current_user.id)

@router.get("/{inbox_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    inbox_id: int,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Obtener historial de mensajes de un lead."""
    chat_svc = ChatService(db)
    return await chat_svc.get_messages(inbox_id)

@router.post("/{inbox_id}/send", response_model=ChatMessageResponse)
async def send_message(
    inbox_id: int,
    request: SendMessageRequest,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Enviar un mensaje de WhatsApp al lead desde el comercial."""
    chat_svc = ChatService(db)
    from app.models.comercial_inbox import Inbox
    
    inbox = await db.get(Inbox, inbox_id)
    if not inbox:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
        
    # Send via WhatsApp API
    try:
        await WhatsAppService.send_text(inbox.telefono, request.contenido)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar mensaje por WhatsApp: {e}")
        
    # Save to db
    msg_create = ChatMessageCreate(
        inbox_id=inbox_id,
        telefono=inbox.telefono,
        direccion='SALIENTE',
        remitente_tipo='COMERCIAL',
        remitente_id=current_user.id,
        contenido=request.contenido,
        estado_envio='ENVIADO'
    )
    return await chat_svc.save_message(msg_create)

@router.post("/{inbox_id}/take")
async def take_chat(
    inbox_id: int,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Tomar control del chat (cambia modo a ASESOR)."""
    chat_svc = ChatService(db)
    inbox = await chat_svc.take_chat(inbox_id, current_user.id)
    return {"status": "success", "modo": inbox.modo, "estado": inbox.estado}

@router.post("/{inbox_id}/release")
async def release_chat(
    inbox_id: int,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Devolver el control del chat al bot (cambia modo a BOT)."""
    chat_svc = ChatService(db)
    inbox = await chat_svc.release_chat(inbox_id)
    return {"status": "success", "modo": inbox.modo}

@router.post("/{inbox_id}/mark-read")
async def mark_messages_read(
    inbox_id: int,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Marcar todos los mensajes entrantes de este chat como leídos."""
    chat_svc = ChatService(db)
    await chat_svc.mark_as_read(inbox_id)
    return {"status": "success"}

@router.patch("/{inbox_id}/estado")
async def change_lead_estado(
    inbox_id: int,
    request: ChangeEstadoRequest,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Cambiar el estado del lead."""
    chat_svc = ChatService(db)
    inbox = await chat_svc.change_estado(inbox_id, request.nuevo_estado)
    return {"status": "success", "estado": inbox.estado, "modo": inbox.modo}
