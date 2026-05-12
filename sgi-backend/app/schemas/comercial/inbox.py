from pydantic import BaseModel
from typing import Optional
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
    tipo_interes: Optional[str] = None  # ASESORIA, COTIZACION, CARGA_LISTA
    bot_config_id: Optional[int] = None        # ID del bot que recibió el lead
    jefe_comercial_id: Optional[int] = None    # Jefe cuyo equipo debe recibir el lead

class InboxResponse(InboxBase):
    id: int
    asignado_a: Optional[int]
    estado: str
    tipo_interes: Optional[str] = None
    tipo_asignacion: Optional[str] = None
    fecha_recepcion: datetime
    fecha_gestion: Optional[datetime] = None

    # Resolved via JOIN in service
    nombre_asignado: Optional[str] = None

    class Config:
        from_attributes = True

class InboxDistributionResponse(BaseModel):
    lead_id: int
    assigned_to: dict # { id, nombre, whatsapp }

class InboxDescartarRequest(BaseModel):
    motivo_descarte_id: int
    comentario_descarte: str
    enviar_mensaje: bool = True

class InboxAsignarManualRequest(BaseModel):
    comercial_id: int
