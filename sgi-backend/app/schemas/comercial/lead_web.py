from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional
from datetime import datetime


class LeadWebCreate(BaseModel):
    """Schema para recibir datos del formulario web (endpoint público)."""
    nombre: str = Field(..., max_length=150)
    correo: str = Field(..., max_length=100)
    telefono: str = Field(..., max_length=20)
    asunto: str = Field(..., max_length=200)
    mensaje: str
    pagina_origen: str = Field(..., max_length=100)
    servicio_interes: Optional[str] = Field(None, max_length=100)


class LeadWebResponse(BaseModel):
    """Schema de respuesta para listar/ver leads web."""
    id: int
    nombre: str
    correo: str
    telefono: str
    asunto: str
    mensaje: str
    pagina_origen: str
    servicio_interes: Optional[str] = None

    # Asignación
    asignado_a: Optional[int] = None
    nombre_asignado: Optional[str] = None
    estado: str

    # Fechas
    fecha_recepcion: datetime
    fecha_asignacion: Optional[datetime] = None
    fecha_gestion: Optional[datetime] = None

    # Notas
    notas: Optional[str] = None

    # Conversión
    cliente_convertido_id: Optional[int] = None

    # Tracking
    tiempo_respuesta_segundos: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class LeadWebPublicResponse(BaseModel):
    """Respuesta para el endpoint público (mínima info)."""
    lead_id: int
    asignado: bool
    mensaje: str


class LeadWebCambiarEstado(BaseModel):
    """Schema para cambiar estado de un lead."""
    estado: str = Field(..., pattern="^(PENDIENTE|EN_GESTION|CONVERTIDO|DESCARTADO)$")
    notas: Optional[str] = None


class LeadWebDescartarRequest(BaseModel):
    """Schema para descartar un lead."""
    motivo_descarte: str = Field(..., max_length=100)
    comentario_descarte: str


class LeadWebConvertirRequest(BaseModel):
    """Schema para convertir un lead en cliente."""
    cliente_id: Optional[int] = Field(None, description="ID del cliente existente para vincular")
    crear_prospecto: bool = Field(False, description="Si True, crea un prospecto nuevo en cartera")


class LeadWebActualizarNotas(BaseModel):
    """Schema para actualizar las notas de un lead."""
    notas: str
