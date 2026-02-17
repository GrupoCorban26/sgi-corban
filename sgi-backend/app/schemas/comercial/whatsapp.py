from pydantic import BaseModel
from typing import Optional, List


class WhatsAppIncoming(BaseModel):
    """Normalized incoming message (simplified for internal use)."""
    from_number: str
    contact_name: str
    message_type: str  # text, interactive, image, audio, video, sticker, location, button
    message_text: str = ""
    button_id: str = ""


# ==========================================
# META WEBHOOK RAW SCHEMAS
# ==========================================

class WhatsAppWebhookValue(BaseModel):
    messaging_product: str
    metadata: dict
    contacts: Optional[List[dict]] = None
    messages: Optional[List[dict]] = None

class WhatsAppWebhookChange(BaseModel):
    value: WhatsAppWebhookValue
    field: str

class WhatsAppWebhookEntry(BaseModel):
    id: str
    changes: List[WhatsAppWebhookChange]

class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppWebhookEntry]


class BotMessage(BaseModel):
    """A single message the bot should send."""
    type: str  # "text" or "buttons"
    content: str = ""
    body: str = ""
    buttons: Optional[List[dict]] = None


class WhatsAppResponse(BaseModel):
    """Response from /process endpoint telling n8n what to send."""
    action: str  # "send_text", "send_buttons", "send_multiple", "no_action"
    messages: List[BotMessage] = []
