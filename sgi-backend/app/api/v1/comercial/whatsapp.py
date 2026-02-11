from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.comercial.whatsapp_service import WhatsAppService
from app.services.comercial.chatbot_service import ChatbotService
from app.schemas.comercial.whatsapp import WhatsAppIncoming, WhatsAppResponse
from app.database.db_connection import get_db

router = APIRouter()


@router.post("/process")
async def process_message(data: WhatsAppIncoming, db: AsyncSession = Depends(get_db)):
    """
    Central endpoint: receives a message, determines what to respond,
    returns the response instructions (but doesn't send them).
    """
    try:
        service = ChatbotService(db)
        response = await service.process_message(data)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-and-send")
async def process_and_send(data: WhatsAppIncoming, db: AsyncSession = Depends(get_db)):
    """
    All-in-one endpoint: processes the message AND sends the response 
    back to the client via WhatsApp API. Returns the response for logging.
    """
    try:
        service = ChatbotService(db)
        response = await service.process_message(data)

        # Send each message in the response
        for msg in response.messages:
            if msg.type == "text":
                await WhatsAppService.send_text(data.from_number, msg.content)
            elif msg.type == "buttons":
                buttons = [{"id": b["id"], "title": b["title"]} for b in msg.buttons]
                await WhatsAppService.send_interactive_buttons(
                    data.from_number, msg.body, buttons
                )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SendTextRequest(BaseModel):
    to: str
    message: str


class ButtonItem(BaseModel):
    id: str
    title: str


class SendInteractiveRequest(BaseModel):
    to: str
    body_text: str
    buttons: List[ButtonItem]


class SendTemplateRequest(BaseModel):
    to: str
    template_name: str
    language: str = "es"
    parameters: Optional[List[str]] = None


@router.post("/send-text")
async def send_text_message(data: SendTextRequest):
    """Send a plain text message to a WhatsApp number."""
    try:
        result = await WhatsAppService.send_text(data.to, data.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template")
async def send_template_message(data: SendTemplateRequest):
    """Send a template message (for first contact or 24h+ window)."""
    try:
        result = await WhatsAppService.send_template(
            data.to, data.template_name, data.language, data.parameters
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-buttons")
async def send_interactive_buttons(data: SendInteractiveRequest):
    """Send interactive reply buttons (max 3, within 24h session)."""
    try:
        buttons = [{"id": b.id, "title": b.title} for b in data.buttons]
        result = await WhatsAppService.send_interactive_buttons(
            data.to, data.body_text, buttons
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
