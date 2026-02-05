from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class ActivoBase(BaseModel):
    producto: str = Field(..., max_length=50, description="Nombre del producto (Laptop, Audífonos, etc.)")
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    serie: Optional[str] = Field(None, max_length=100, description="Número de serie")
    codigo_inventario: Optional[str] = Field(None, max_length=50, description="Código interno de inventario")
    estado_id: int = Field(..., description="ID del estado físico (FK a estado_activo)")
    observaciones: Optional[str] = None


class ActivoCreate(ActivoBase):
    """Schema para crear activo"""
    pass


class ActivoUpdate(BaseModel):
    """Schema para actualizar activo"""
    producto: Optional[str] = Field(None, max_length=50)
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    serie: Optional[str] = Field(None, max_length=100)
    codigo_inventario: Optional[str] = Field(None, max_length=50)
    observaciones: Optional[str] = None


class CambioEstadoRequest(BaseModel):
    """Schema para cambiar estado de un activo"""
    estado_nuevo_id: int = Field(..., description="ID del nuevo estado físico")
    motivo: str = Field(..., max_length=100, description="REPARACION, DETERIORO, REVISION, BAJA")
    observaciones: Optional[str] = Field(None, max_length=500)


class ActivoResponse(BaseModel):
    """Schema de respuesta con datos completos"""
    id: int
    producto: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    codigo_inventario: Optional[str] = None
    estado_id: Optional[int] = None
    estado_nombre: Optional[str] = None  # Nombre del estado (BUENO, MALOGRADO, etc.)
    estado_nombre: Optional[str] = None  # Nombre del estado (BUENO, MALOGRADO, etc.)
    estado_color: Optional[str] = None
    is_disponible: bool = True
    is_active: bool = True
    observaciones: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Campos de asignación actual (si no está disponible)
    empleado_asignado_id: Optional[int] = None
    empleado_asignado_nombre: Optional[str] = None
    fecha_asignacion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ActivoPaginationResponse(BaseModel):
    """Respuesta paginada de activos"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[ActivoResponse]


class ActivoHistorialResponse(BaseModel):
    """Respuesta de historial de un activo"""
    id: int
    activo_id: int
    estado_anterior_id: Optional[int] = None
    estado_anterior_nombre: Optional[str] = None
    estado_nuevo_id: int
    estado_nuevo_nombre: Optional[str] = None
    motivo: str
    observaciones: Optional[str] = None
    empleado_activo_id: Optional[int] = None
    registrado_por: Optional[int] = None
    registrado_por_nombre: Optional[str] = None
    fecha_cambio: datetime
    
    model_config = ConfigDict(from_attributes=True)


class OperationResult(BaseModel):
    """Respuesta genérica para operaciones"""
    success: bool
    message: str
    id: Optional[int] = None


class ActivoDropdown(BaseModel):
    """Schema para dropdown de activos disponibles"""
    id: int
    descripcion: str  # "Laptop HP ProBook - Serie: ABC123"
    
    model_config = ConfigDict(from_attributes=True)


class AsignacionActivoRequest(BaseModel):
    """Request para asignar activo a empleado"""
    empleado_id: int
    estado_entrega_id: Optional[int] = Field(None, description="Estado del activo al entregar (usa estado actual si no se especifica)")
    observaciones: Optional[str] = None


class DevolucionActivoRequest(BaseModel):
    """Request para registrar devolución de activo"""
    estado_devolucion_id: int = Field(..., description="Estado del activo al devolver")
    motivo: str = Field(..., description="RENUNCIA, CAMBIO_EQUIPO, FIN_CONTRATO, etc.")
    observaciones: Optional[str] = None


class AsignacionResponse(BaseModel):
    """Respuesta con info de asignación"""
    id: int
    activo_id: int
    empleado_id: int
    empleado_nombre: str
    fecha_entrega: datetime
    fecha_devolucion: Optional[datetime] = None
    estado_entrega_id: Optional[int] = None
    estado_entrega_nombre: Optional[str] = None
    estado_devolucion_id: Optional[int] = None
    estado_devolucion_nombre: Optional[str] = None
    observaciones: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
