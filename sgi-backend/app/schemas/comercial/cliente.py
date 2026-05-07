from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime, date


class ClienteBase(BaseModel):
    ruc: Optional[str] = Field(None, max_length=11)
    razon_social: str = Field(..., min_length=1, max_length=255)
    direccion_fiscal: Optional[str] = Field(None, max_length=255)
    distrito_id: Optional[int] = None
    estado_id: Optional[int] = None
    origen_id: Optional[int] = None
    proxima_fecha_contacto: Optional[date] = None


class ClienteCreate(ClienteBase):
    """Para crear un cliente - comercial se asigna automáticamente"""
    pass


class ClienteUpdate(ClienteBase):
    """Para actualizar un cliente"""
    razon_social: Optional[str] = Field(None, min_length=1, max_length=255)
    comercial_encargado_id: Optional[int] = None


class ClienteResponse(ClienteBase):
    id: int
    comercial_encargado_id: Optional[int] = None
    comercial_nombre: Optional[str] = None
    estado_nombre: Optional[str] = None
    origen_nombre: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ClienteDropdown(BaseModel):
    id: int
    razon_social: str
    ruc: Optional[str] = None


class ClienteCambiarEstado(BaseModel):
    nuevo_estado_id: int
    motivo: Optional[str] = Field(None, max_length=500)


class ClienteMarcarCaido(BaseModel):
    motivo: str = Field(..., max_length=500)
    fecha_seguimiento: Optional[date] = None


# --- Schemas de Historial ---

class ClienteHistorialResponse(BaseModel):
    id: int
    cliente_id: int
    estado_anterior_nombre: Optional[str] = None
    estado_nuevo_nombre: Optional[str] = None
    motivo: Optional[str] = None
    tiempo_en_estado_anterior: Optional[int] = None  # minutos
    registrado_por: Optional[int] = None
    nombre_registrador: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Schemas de Dashboard/Métricas ---

class DashboardRequest(BaseModel):
    fecha_inicio: date
    fecha_fin: date


class ComercialMetrica(BaseModel):
    usuario_id: int
    nombre: str
    leads_atendidos: int = 0
    tiempo_respuesta_promedio_min: Optional[float] = None
    clientes_convertidos: int = 0
    llamadas_realizadas: int = 0
    tasa_conversion: float = 0.0


class DashboardResponse(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    pipeline: dict
    comerciales: list[ComercialMetrica]
    origenes: dict
    operativo: dict
