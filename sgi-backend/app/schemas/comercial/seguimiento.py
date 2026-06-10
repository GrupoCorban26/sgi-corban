from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date


# --- Schemas de Catálogos ---

class TipoCargaResponse(BaseModel):
    id: int
    nombre: str
    orden: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TipoServicioComercialResponse(BaseModel):
    id: int
    nombre: str
    orden: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class SegmentacionCierreResponse(BaseModel):
    id: int
    nombre: str
    orden: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DocumentoOperacionalResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DocumentoOperacionalCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    descripcion: Optional[str] = Field(None, max_length=500)


class DocumentoOperacionalUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    descripcion: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


# --- Schemas de Cotización ---

class CotizacionItemBase(BaseModel):
    tipo_carga_id: int
    tipo_servicio_id: int
    tipo_operacion: Optional[str] = Field(None, max_length=20, description="IMPORTACION | EXPORTACION")
    pais_origen: Optional[str] = Field(None, max_length=50)
    incoterm: Optional[str] = Field(None, max_length=10, description="EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF")


class CotizacionItemCreate(CotizacionItemBase):
    pass


class CotizacionItemResponse(CotizacionItemBase):
    id: int
    seguimiento_id: int
    estado: str  # PENDIENTE, ACEPTADO, RECHAZADO, DESCARTADO
    codigo_operacion: Optional[str] = None
    segmentacion_id: Optional[int] = None
    segmentacion_nombre: Optional[str] = None
    fecha_cierre: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    tipo_carga_nombre: Optional[str] = None
    tipo_servicio_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Schemas de Documentos del Seguimiento ---

class SeguimientoDocumentoResponse(BaseModel):
    id: int
    documento_id: int
    documento_nombre: Optional[str] = None
    completado: bool
    fecha_recepcion: Optional[datetime] = None
    registrado_por: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentoToggle(BaseModel):
    completado: bool


# --- Schemas de Alertas ---

class AlertaEnviadaResponse(BaseModel):
    id: int
    dias_antes_eta: int
    fecha_envio: datetime
    tipo: str

    model_config = ConfigDict(from_attributes=True)


# --- Schemas de Seguimiento ---

class SeguimientoCreate(BaseModel):
    cliente_id: Optional[int] = None
    titulo: str = Field(..., min_length=1, max_length=150)
    items: List[CotizacionItemCreate] = Field(..., min_length=1)
    comentario_inicial: Optional[str] = None
    estado_inicial: Optional[str] = Field("SOLICITUD", description="SOLICITUD | COTIZADO")
    # Campos temporales para prospecto sin cliente formal
    temp_cliente_nombre: Optional[str] = Field(None, max_length=150)
    temp_cliente_ruc: Optional[str] = Field(None, max_length=20)
    temp_cliente_contacto: Optional[str] = Field(None, max_length=100)
    temp_cliente_correo: Optional[str] = Field(None, max_length=100)
    temp_cliente_telefono: Optional[str] = Field(None, max_length=30)


class CotizacionUpdate(BaseModel):
    id: int
    tipo_carga_id: Optional[int] = None
    tipo_servicio_id: Optional[int] = None
    tipo_operacion: Optional[str] = Field(None, max_length=20)
    pais_origen: Optional[str] = Field(None, max_length=50)
    incoterm: Optional[str] = Field(None, max_length=10)
    codigo_operacion: Optional[str] = Field(None, max_length=20)
    segmentacion_id: Optional[int] = None


class SeguimientoUpdate(BaseModel):
    cliente_id: Optional[int] = None
    titulo: Optional[str] = Field(None, min_length=1, max_length=150)
    fecha_eta: Optional[date] = None
    contacto_alerta_id: Optional[int] = None
    temp_cliente_nombre: Optional[str] = Field(None, max_length=150)
    temp_cliente_ruc: Optional[str] = Field(None, max_length=20)
    temp_cliente_contacto: Optional[str] = Field(None, max_length=100)
    temp_cliente_correo: Optional[str] = Field(None, max_length=100)
    temp_cliente_telefono: Optional[str] = Field(None, max_length=30)
    cotizaciones: Optional[List[CotizacionUpdate]] = None


class SeguimientoResponse(BaseModel):
    id: int
    cliente_id: Optional[int] = None
    cliente_razon_social: Optional[str] = None
    cliente_ruc: Optional[str] = None
    comercial_id: int
    comercial_nombre: Optional[str] = None
    titulo: str
    estado: str  # SOLICITUD, COTIZADO, CIERRE, EN_OPERACION, CARGA_ENTREGADA, CAIDO
    motivo_caida: Optional[str] = None
    fecha_eta: Optional[date] = None
    fecha_limite_documentos: Optional[date] = None
    contacto_alerta_id: Optional[int] = None
    # Campos temporales
    temp_cliente_nombre: Optional[str] = None
    temp_cliente_ruc: Optional[str] = None
    temp_cliente_contacto: Optional[str] = None
    temp_cliente_correo: Optional[str] = None
    temp_cliente_telefono: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    cotizaciones: List[CotizacionItemResponse] = []
    documentos: List[SeguimientoDocumentoResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Schemas de Transición / Gestión ---

class ClienteRegistroFaseCierre(BaseModel):
    """Datos fiscales obligatorios para registrar formalmente al cliente al pasar a CIERRE."""
    ruc: str = Field(..., min_length=11, max_length=11, description="RUC de 11 dígitos")
    razon_social: str = Field(..., min_length=1, max_length=150)
    direccion_fiscal: str = Field(..., min_length=1, max_length=250)
    distrito_id: int
    origen_id: int


class CotizacionCerrar(BaseModel):
    cotizacion_id: int
    codigo_operacion: str = Field(..., min_length=1, max_length=20, description="Código COR de SISPAC")
    segmentacion_id: int
    medio_gestion_id: int
    comentario: Optional[str] = Field(None, max_length=500)
    cliente_registro: Optional[ClienteRegistroFaseCierre] = None
    fecha_cambio: Optional[date] = Field(None, description="Fecha de la transición. Si no se envía, se usa la fecha actual.")


class SeguimientoCaer(BaseModel):
    motivo_caida: str = Field(..., min_length=1, max_length=500)
    medio_gestion_id: int           # Canal por el cual se contactó al cliente
    comentario: Optional[str] = Field(None, max_length=500)
    fecha_cambio: Optional[date] = Field(None, description="Fecha de la transición. Si no se envía, se usa la fecha actual.")


class SeguimientoMover(BaseModel):
    estado_nuevo: str = Field(..., description="SOLICITUD | COTIZADO | CIERRE | EN_OPERACION | CARGA_ENTREGADA | CAIDO")
    medio_gestion_id: int           # Canal de contacto obligatorio (Llamada, WhatsApp, Correo)
    comentario: Optional[str] = Field(None, max_length=500)
    fecha_cambio: Optional[date] = Field(None, description="Fecha de la transición. Si no se envía, se usa la fecha actual.")


class SeguimientoOperar(BaseModel):
    """Payload para transición CIERRE → EN_OPERACION."""
    fecha_eta: date
    incoterm: str = Field(..., max_length=10, description="EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF")
    documento_ids: List[int] = Field(..., min_length=1, description="IDs de documentos requeridos para este embarque")
    contacto_alerta_id: int         # Contacto del cliente para alertas por correo
    medio_gestion_id: int
    comentario: Optional[str] = Field(None, max_length=500)
    fecha_cambio: Optional[date] = Field(None, description="Fecha de la transición. Si no se envía, se usa la fecha actual.")


class SeguimientoEntregar(BaseModel):
    """Payload para transición EN_OPERACION → CARGA_ENTREGADA."""
    medio_gestion_id: int
    comentario: Optional[str] = Field(None, max_length=500)
    fecha_cambio: Optional[date] = Field(None, description="Fecha de la transición. Si no se envía, se usa la fecha actual.")


# --- Schemas de Auditoría / Comentarios ---

class SeguimientoComentarioCreate(BaseModel):
    comentario: str = Field(..., min_length=1)
    medio_gestion_id: Optional[int] = None


class SeguimientoComentarioResponse(BaseModel):
    id: int
    seguimiento_id: int
    comentario: str
    medio_gestion_id: Optional[int] = None
    medio_gestion_nombre: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
    creador_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SeguimientoHistorialResponse(BaseModel):
    id: int
    seguimiento_id: int
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    comentario: Optional[str] = None
    tiempo_en_estado_anterior: Optional[int] = None  # en minutos
    fecha_cambio: datetime
    registrado_por: Optional[int] = None
    usuario_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
