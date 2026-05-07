from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class LoteCreate(BaseModel):
    """Schema para crear un nuevo lote."""
    nombre: str = Field(..., min_length=1, max_length=150, description="Nombre descriptivo del lote")


class LoteResponse(BaseModel):
    """Schema de respuesta con estadísticas del lote."""
    id: int
    nombre: str
    is_active: bool
    total_contactos: int = 0
    disponibles: int = 0
    created_by_nombre: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoteToggleResponse(BaseModel):
    """Respuesta al activar/desactivar un lote."""
    success: bool
    lote_id: int
    is_active: bool
    message: str
