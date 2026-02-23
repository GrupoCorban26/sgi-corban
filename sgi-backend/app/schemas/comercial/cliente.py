from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal
from datetime import datetime, date


# Catálogos controlados
OrigenCliente = Literal[
    "BASE_DATOS", "PUBLICIDAD_META", "CARTERA_PROPIA",
    "WHATSAPP", "REFERIDO", "OTRO"
]

EstadoCliente = Literal[
    "PROSPECTO", "EN_NEGOCIACION", "CLIENTE", "PERDIDO", "INACTIVO"
]


class ClienteBase(BaseModel):
    ruc: Optional[str] = Field(None, max_length=11)
    razon_social: str = Field(..., min_length=1, max_length=255)
    nombre_comercial: Optional[str] = Field(None, max_length=255)
    direccion_fiscal: Optional[str] = Field(None, max_length=255)
    distrito_id: Optional[int] = None
    tipo_estado: EstadoCliente = Field(default="PROSPECTO")
    origen: Optional[OrigenCliente] = None
    sub_origen: Optional[str] = Field(None, max_length=100)
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
    fecha_primer_contacto: Optional[datetime] = None
    fecha_conversion_cliente: Optional[datetime] = None
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
    nuevo_estado: EstadoCliente
    motivo: Optional[str] = Field(None, max_length=500)


# --- Schemas de Historial ---

class ClienteHistorialResponse(BaseModel):
    id: int
    cliente_id: int
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    motivo: Optional[str] = None
    origen_cambio: str
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
