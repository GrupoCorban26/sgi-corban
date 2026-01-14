from pydantic import BaseModel, Field
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
    proxima_fecha_contacto: Optional[date] = None


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

    class Config:
        from_attributes = True


class ClienteDropdown(BaseModel):
    id: int
    razon_social: str
    ruc: Optional[str] = None
