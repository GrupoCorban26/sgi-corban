from pydantic import BaseModel
from typing import Optional, List


class WhatsAppIncoming(BaseModel):
    """Incoming message from n8n webhook."""
    from_number: str
    contact_name: str
    message_type: str  # text, interactive, image, audio, video, sticker, location
    message_text: str = ""
    button_id: str = ""


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
