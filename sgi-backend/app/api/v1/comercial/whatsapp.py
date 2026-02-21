from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.comercial.whatsapp_service import WhatsAppService
from app.services.comercial.chatbot_service import ChatbotService
from app.schemas.comercial.whatsapp import WhatsAppIncoming, WhatsAppResponse, WhatsAppWebhookPayload
from app.database.db_connection import get_db

router = APIRouter()


@router.get("/test")
async def test_endpoint():
    return {"message": "WhatsApp Router Loaded OK"}


@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge")
):
    """
    Webhook verification endpoint for Meta.
    """
    VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "sgi_token_123")
    
    if mode == "subscribe" and token == VERIFY_TOKEN:
        from fastapi import Response
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook_message(
    payload: WhatsAppWebhookPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive messages from Meta Webhook.
    Values: entry -> changes -> value -> messages
    """
    try:
        service = ChatbotService(db)
        
        # Iterar sobre las entradas (normalmente 1)
        for entry in payload.entry:
            for change in entry.changes:
                value = change.value
                
                if not value.messages:
                    continue
                
                # Procesar cada mensaje
                for msg in value.messages:
                    # Extraer datos básicos
                    from_number = msg.get("from")
                    msg_type = msg.get("type")
                    msg_id = msg.get("id")
                    
                    # Obtener nombre del contacto
                    contact_name = "Usuario"
                    if value.contacts:
                        contact = next((c for c in value.contacts if c.get("wa_id") == from_number), None)
                        if contact:
                            contact_name = contact.get("profile", {}).get("name", "Usuario")
                            
                    # Normalizar a WhatsAppIncoming
                    incoming = WhatsAppIncoming(
                        from_number=from_number,
                        contact_name=contact_name,
                        message_type=msg_type
                    )
                    
                    # Extraer contenido según el tipo
                    if msg_type == "text":
                        incoming.message_text = msg.get("text", {}).get("body", "")
                    elif msg_type == "interactive":
                        interactive = msg.get("interactive", {})
                        if interactive.get("type") == "button_reply":
                            incoming.button_id = interactive.get("button_reply", {}).get("id", "")
                            incoming.message_text = interactive.get("button_reply", {}).get("title", "")
                        elif interactive.get("type") == "list_reply":
                            incoming.button_id = interactive.get("list_reply", {}).get("id", "")
                            incoming.message_text = interactive.get("list_reply", {}).get("title", "")
                    elif msg_type == "button":
                        button = msg.get("button", {})
                        incoming.message_text = button.get("text", "")
                    elif msg_type == "location":
                        location = msg.get("location", {})
                        incoming.latitude = location.get("latitude")
                        incoming.longitude = location.get("longitude")
                        incoming.message_text = location.get("name", "")
                    # Extraer parámetros 
                    from app.services.comercial.chat_service import ChatService
                    from app.schemas.comercial.chat import ChatMessageCreate
                    from app.models.comercial_inbox import Inbox
                    from sqlalchemy import select, and_

                    from_num_norm = from_number.replace(" ", "").replace("+", "")
                    if from_num_norm.startswith("51"):
                        from_num_norm = from_num_norm[2:]

                    # Check if there's an active inbox
                    query_inbox = select(Inbox).where(
                        and_(
                            Inbox.telefono.like(f"%{from_num_norm}%"),
                            Inbox.estado.not_in(['CIERRE', 'DESCARTADO', 'CONVERTIDO'])
                        )
                    )
                    result_inbox = await db.execute(query_inbox)
                    inbox = result_inbox.scalars().first()

                    chat_svc = ChatService(db)

                    # Save incoming message if Inbox exists
                    if inbox:
                        await chat_svc.save_message(ChatMessageCreate(
                            inbox_id=inbox.id,
                            telefono=from_number,
                            direccion='ENTRANTE',
                            remitente_tipo='CLIENTE',
                            contenido=incoming.message_text,
                            whatsapp_msg_id=msg_id
                        ))

                    # If mode is ASESOR, skip bot
                    if inbox and inbox.modo == 'ASESOR':
                        # Here we would eventually add the rules for out of hours and +24h/+48h timeout
                        continue
                        
                    # Procesar con el bot
                    response = await service.process_message(incoming)
                    
                    # Chequear si el bot creó el inbox recién
                    if not inbox:
                        result_inbox_after = await db.execute(query_inbox)
                        inbox = result_inbox_after.scalars().first()
                    
                    # Enviar respuesta y guardarla
                    for bot_msg in response.messages:
                        txt_content = bot_msg.content if bot_msg.type == "text" else bot_msg.body
                        if bot_msg.type == "text":
                            await WhatsAppService.send_text(from_number, bot_msg.content)
                        elif bot_msg.type == "buttons":
                            buttons = [{"id": b["id"], "title": b["title"]} for b in bot_msg.buttons]
                            await WhatsAppService.send_interactive_buttons(
                                from_number, bot_msg.body, buttons
                            )
                        elif bot_msg.type == "list":
                            await WhatsAppService.send_interactive_list(
                                from_number, bot_msg.body, bot_msg.header,
                                bot_msg.button_text, bot_msg.sections
                            )
                            
                        # Save bot responses to history if inbox exists
                        if inbox:
                            await chat_svc.save_message(ChatMessageCreate(
                                inbox_id=inbox.id,
                                telefono=from_number,
                                direccion='SALIENTE',
                                remitente_tipo='BOT',
                                contenido=txt_content,
                                estado_envio='ENVIADO'
                            ))

        return {"status": "ok"}
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error processing webhook: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
