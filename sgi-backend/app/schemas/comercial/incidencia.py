from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime, date


class IncidenciaBase(BaseModel):
    seguimiento_id: Optional[int] = None
    cliente_id: int
    codigo_operacion: Optional[str] = Field(None, max_length=20)
    descripcion: str = Field(..., min_length=1)
    observacion: Optional[str] = None


class IncidenciaCreate(IncidenciaBase):
    pass


class IncidenciaUpdate(BaseModel):
    descripcion: Optional[str] = None
    observacion: Optional[str] = None
    estado: Optional[str] = Field(None, description="ABIERTA | EN_INVESTIGACION | RESUELTA")
    resolucion: Optional[str] = None
    fecha_resolucion: Optional[date] = None


class IncidenciaResolver(BaseModel):
    resolucion: str = Field(..., min_length=1)
    fecha_resolucion: Optional[date] = None


class IncidenciaResponse(IncidenciaBase):
    id: int
    comercial_id: int
    comercial_nombre: Optional[str] = None
    cliente_razon_social: Optional[str] = None
    estado: str
    resolucion: Optional[str] = None
    fecha_resolucion: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
