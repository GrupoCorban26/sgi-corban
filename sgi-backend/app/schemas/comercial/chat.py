from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class ChatMessageBase(BaseModel):
    inbox_id: int
    telefono: str
    direccion: str  # 'ENTRANTE' | 'SALIENTE'
    remitente_tipo: str  # 'CLIENTE' | 'COMERCIAL' | 'BOT'
    contenido: str
    tipo_contenido: str = "text"  # 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker'
    media_url: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    remitente_id: Optional[int] = None
    whatsapp_msg_id: Optional[str] = None
    estado_envio: Optional[str] = "ENVIADO"

class ChatMessageResponse(ChatMessageBase):
    id: int
    remitente_id: Optional[int] = None
    whatsapp_msg_id: Optional[str] = None
    estado_envio: Optional[str] = None
    leido: bool
    created_at: datetime
    tipo_contenido: str = "text"
    media_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SendMessageRequest(BaseModel):
    contenido: str

class TakeChatRequest(BaseModel):
    pass

class ReleaseChatRequest(BaseModel):
    pass

class ChangeEstadoRequest(BaseModel):
    nuevo_estado: str

class ReassignRequest(BaseModel):
    nuevo_comercial_id: int

class ChatConversationPreview(BaseModel):
    inbox_id: int
    telefono: str
    nombre_whatsapp: Optional[str] = None
    estado: str
    modo: str
    ultimo_mensaje_at: Optional[datetime] = None
    mensajes_no_leidos: int = 0
    ultimo_mensaje_preview: Optional[str] = None
    asignado_a: Optional[int] = None
