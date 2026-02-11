import httpx
import os
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WHATSAPP_API_URL = f"https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_ID}/messages"


class WhatsAppService:
    """Service to send messages via WhatsApp Cloud API."""

    @staticmethod
    async def send_text(to: str, message: str) -> dict:
        """Send a simple text message."""
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": message},
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def send_template(to: str, template_name: str, language: str = "es", parameters: list = None) -> dict:
        """Send a template message (required for first contact or after 24h)."""
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        
        template = {
            "name": template_name,
            "language": {"code": language},
        }
        
        if parameters:
            template["components"] = [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in parameters],
                }
            ]
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": template,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)
            return response.json()

    @staticmethod
    async def send_interactive_buttons(to: str, body_text: str, buttons: list) -> dict:
        """
        Send an interactive message with reply buttons (max 3).
        buttons: [{"id": "btn_importar", "title": "Quiero importar"}, ...]
        Only works within 24h session window.
        """
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {"id": btn["id"], "title": btn["title"]},
                        }
                        for btn in buttons[:3]  # Max 3 buttons
                    ]
                },
            },
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)
            if response.status_code >= 400:
                print(f"❌ WhatsApp API Error (Interactive): {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()
