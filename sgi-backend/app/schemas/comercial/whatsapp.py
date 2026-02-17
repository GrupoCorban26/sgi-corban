from pydantic import BaseModel
from typing import Optional, List


class WhatsAppIncoming(BaseModel):
    """Normalized incoming message (simplified for internal use)."""
    from_number: str
    contact_name: str
    message_type: str  # text, interactive, location, button
    message_text: str = ""
    button_id: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


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
    type: str  # "text", "buttons", or "list"
    content: str = ""
    body: str = ""
    buttons: Optional[List[dict]] = None
    # List message fields
    header: str = ""
    button_text: str = ""
    sections: Optional[List[dict]] = None


class WhatsAppResponse(BaseModel):
    """Response from chatbot service."""
    action: str  # "send_text", "send_buttons", "send_list", "send_multiple", "no_action"
    messages: List[BotMessage] = []
