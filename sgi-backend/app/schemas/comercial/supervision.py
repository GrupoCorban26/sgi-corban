"""
Schemas Pydantic para el módulo de Supervisión WhatsApp (Evolution API v2).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ─────────────────────────────────────────────
# Instancias
# ─────────────────────────────────────────────

class InstanciaCreate(BaseModel):
    """Crear una instancia de WhatsApp para un comercial."""
    usuario_id: int = Field(..., description="ID del usuario (comercial) a vincular")


class InstanciaResponse(BaseModel):
    """Respuesta al listar instancias."""
    id: int
    instance_name: str
    instance_id: Optional[str] = None
    usuario_id: int
    nombre_comercial: Optional[str] = None  # Resuelto vía JOIN
    telefono: Optional[str] = None
    estado: str
    profile_name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime] = None
    total_conversaciones: int = 0
    total_mensajes: int = 0

    class Config:
        from_attributes = True


class InstanciaQRResponse(BaseModel):
    """QR code para escanear."""
    instance_name: str
    estado: str
    qr_code: Optional[str] = None  # base64 del QR
    message: Optional[str] = None


# ─────────────────────────────────────────────
# Conversaciones
# ─────────────────────────────────────────────

class ConversacionResponse(BaseModel):
    """Un chat de un comercial."""
    id: int
    instancia_id: int
    remote_jid: str
    nombre_contacto: Optional[str] = None
    es_grupo: bool = False
    ultimo_mensaje: Optional[str] = None
    ultimo_mensaje_at: Optional[datetime] = None
    mensajes_no_leidos: int = 0

    class Config:
        from_attributes = True


class ConversacionListResponse(BaseModel):
    """Lista paginada de conversaciones."""
    items: List[ConversacionResponse]
    total: int


# ─────────────────────────────────────────────
# Mensajes
# ─────────────────────────────────────────────

class MensajeResponse(BaseModel):
    """Un mensaje individual."""
    id: int
    message_id: str
    from_me: bool = False
    tipo: str = "text"
    contenido: Optional[str] = None
    media_url: Optional[str] = None
    media_mimetype: Optional[str] = None
    timestamp: datetime
    participant: Optional[str] = None
    participant_name: Optional[str] = None
    reaccion: Optional[str] = None

    class Config:
        from_attributes = True


class MensajeListResponse(BaseModel):
    """Lista paginada de mensajes."""
    items: List[MensajeResponse]
    total: int


# ─────────────────────────────────────────────
# Webhook (Evolution API → SGI)
# ─────────────────────────────────────────────

class WebhookPayload(BaseModel):
    """
    Payload genérico que llega desde Evolution API.
    Se parsean los campos según el evento.
    """
    event: str
    instance: str  # instance_name
    data: Any  # Contenido varía según el evento
    destination: Optional[str] = None
    date_time: Optional[str] = None
    sender: Optional[str] = None
    server_url: Optional[str] = None
    apikey: Optional[str] = None
