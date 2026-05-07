from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# =========================================
# SCHEMAS DE NOTIFICACIÓN
# =========================================

class NotificacionBase(BaseModel):
    tipo: str
    titulo: str
    mensaje: Optional[str] = None
    url_destino: Optional[str] = None
    datos_extra: Optional[str] = None

class NotificacionCreate(NotificacionBase):
    usuario_id: int

class NotificacionResponse(NotificacionBase):
    id: int
    usuario_id: int
    leida: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
