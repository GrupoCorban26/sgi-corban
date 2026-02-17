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
                    elif msg_type == "button": # Template buttons response often comes as 'button' type in legacy or specific api versions but mostly interactive
                        button = msg.get("button", {})
                        incoming.message_text = button.get("text", "")
                        
                    # Procesar con el bot
                    response = await service.process_message(incoming)
                    
                    # Enviar respuesta
                    for bot_msg in response.messages:
                        if bot_msg.type == "text":
                            await WhatsAppService.send_text(from_number, bot_msg.content)
                        elif bot_msg.type == "buttons":
                            buttons = [{"id": b["id"], "title": b["title"]} for b in bot_msg.buttons]
                            await WhatsAppService.send_interactive_buttons(
                                from_number, bot_msg.body, buttons
                            )

        return {"status": "ok"}
            
    except Exception as e:
        # Importante: Retornar 200 ok a Meta incluso si fallamos internamente para evitar reintentos infinitos
        # Loguear el error
        print(f"Error processing webhook: {str(e)}")
        return {"status": "error", "detail": str(e)}
