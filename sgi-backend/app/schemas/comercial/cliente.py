from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime, date


class ClienteBase(BaseModel):
    ruc: Optional[str] = Field(None, max_length=11)
    razon_social: str = Field(..., min_length=1, max_length=255)
    nombre_comercial: Optional[str] = Field(None, max_length=255)
    direccion_fiscal: Optional[str] = Field(None, max_length=255)
    distrito_id: Optional[int] = None
    tipo_estado: str = Field(default="PROSPECTO", max_length=20)
    origen: Optional[str] = Field(None, max_length=50)
    comentario_ultima_llamada: Optional[str] = Field(None, max_length=500)
    ultimo_contacto: Optional[datetime] = None
    proxima_fecha_contacto: Optional[date] = None

    # Pipeline fields
    motivo_perdida: Optional[str] = Field(None, max_length=50)
    fecha_perdida: Optional[date] = None
    fecha_reactivacion: Optional[date] = None


class ClienteCreate(ClienteBase):
    """Para crear un cliente - área y comercial se asignan automáticamente"""
    pass


class ClienteUpdate(ClienteBase):
    """Para actualizar un cliente"""
    razon_social: Optional[str] = Field(None, min_length=1, max_length=255)
    area_encargada_id: Optional[int] = None
    comercial_encargado_id: Optional[int] = None


class ClienteResponse(ClienteBase):
    id: int
    area_encargada_id: Optional[int] = None
    comercial_encargado_id: Optional[int] = None
    area_nombre: Optional[str] = None
    comercial_nombre: Optional[str] = None
    ultimo_contacto: Optional[datetime] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ClienteDropdown(BaseModel):
    id: int
    razon_social: str
    ruc: Optional[str] = None


class ClienteMarcarPerdido(BaseModel):
    motivo_perdida: str = Field(..., max_length=50)
    fecha_reactivacion: Optional[date] = None


class ClienteCambiarEstado(BaseModel):
    nuevo_estado: str = Field(..., max_length=20)
