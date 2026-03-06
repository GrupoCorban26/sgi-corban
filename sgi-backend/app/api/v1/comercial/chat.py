from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.db_connection import get_db
from app.core.dependencies import get_current_user_obj, resolver_comercial_ids
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

@router.get("/conversations", response_model=List[ChatConversationPreview])
async def get_conversations(
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: list = Depends(resolver_comercial_ids),
    db: AsyncSession = Depends(get_db)
):
    """Obtener conversaciones activas filtradas por equipo del usuario."""
    chat_svc = ChatService(db)
    
    # Si comercial_ids es None → rol global (Admin/Sistemas/Gerencia), ve todo
    if comercial_ids is None:
        return await chat_svc.get_all_conversations()
    
    # Jefe Comercial o Comercial → filtrar por equipo
    return await chat_svc.get_all_conversations(comercial_ids=comercial_ids)

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
    """Devolver el control del chat al bot (cambia modo a BOT) y envía despedida."""
    chat_svc = ChatService(db)
    # 1. Recuperar info antes de liberar
    from app.models.comercial_inbox import Inbox
    inbox = await db.get(Inbox, inbox_id)
    if not inbox:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    telefono = inbox.telefono

    # 2. Hacer release en base de datos
    inbox = await chat_svc.release_chat(inbox_id)
    
    # 3. Enviar mensaje de WhatsApp automático y flujo de post-atención interactivo
    from app.services.comercial.chatbot_service import ChatbotService
    bot_svc = ChatbotService(db)
    await bot_svc.initiate_post_atencion(telefono, inbox.id)

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
