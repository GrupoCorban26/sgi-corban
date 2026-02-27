from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InboxBase(BaseModel):
    telefono: str
    mensaje_inicial: Optional[str] = None
    nombre_whatsapp: Optional[str] = None

class InboxCreate(InboxBase):
    pass

class InboxDistribute(BaseModel):
    telefono: str
    mensaje: str
    nombre_display: Optional[str] = None
    tipo_interes: Optional[str] = None  # IMPORTACION, ASESORIA, DUDAS

class InboxResponse(InboxBase):
    id: int
    asignado_a: Optional[int]
    estado: str
    tipo_interes: Optional[str] = None
    fecha_recepcion: datetime
    fecha_gestion: Optional[datetime]
    
    # Nested user info
    nombre_asignado: Optional[str] = None
    telefono_asignado: Optional[str] = None

    class Config:
        from_attributes = True

class InboxDistributionResponse(BaseModel):
    lead_id: int
    assigned_to: dict # { id, nombre, whatsapp }

class InboxDescartarRequest(BaseModel):
    motivo_descarte: str
    comentario_descarte: str

