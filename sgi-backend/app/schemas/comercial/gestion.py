from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class GestionCreate(BaseModel):
    medio_id: int
    motivo_id: int
    comentario: Optional[str] = None
    proxima_fecha_contacto: Optional[date] = None
    nuevo_estado_id: Optional[int] = None  # Cambio de estado opcional del cliente


class GestionResponse(BaseModel):
    id: int
    cliente_id: int
    medio_nombre: Optional[str] = None
    motivo_nombre: Optional[str] = None
    comentario: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
