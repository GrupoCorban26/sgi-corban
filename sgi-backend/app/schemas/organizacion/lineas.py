from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# REQUEST SCHEMAS
# ============================================

class LineaCreate(BaseModel):
    numero: str = Field(..., max_length=20, description="Número de celular")
    gmail: str = Field(..., max_length=100, description="Gmail configurado")
    operador: Optional[str] = Field(None, max_length=30)
    plan: Optional[str] = Field(None, max_length=50)
    proveedor: Optional[str] = Field(None, max_length=50, description="Razón social (CORBAN ADUANAS, etc)")
    activo_id: Optional[int] = Field(None, description="Celular donde instalar")
    empleado_id: Optional[int] = Field(None, description="Empleado a asignar")
    observaciones: Optional[str] = Field(None, max_length=500)


class LineaUpdate(BaseModel):
    numero: Optional[str] = Field(None, max_length=20)
    gmail: Optional[str] = Field(None, max_length=100)
    operador: Optional[str] = Field(None, max_length=30)
    plan: Optional[str] = Field(None, max_length=50)
    proveedor: Optional[str] = Field(None, max_length=50)
    observaciones: Optional[str] = Field(None, max_length=500)


class CambiarCelularRequest(BaseModel):
    nuevo_activo_id: int = Field(..., description="ID del nuevo celular")
    observaciones: Optional[str] = Field(None, max_length=500)


class AsignarEmpleadoRequest(BaseModel):
    empleado_id: int = Field(..., description="ID del empleado")
    observaciones: Optional[str] = Field(None, max_length=500)


# ============================================
# RESPONSE SCHEMAS
# ============================================

class LineaResponse(BaseModel):
    id: int
    numero: str
    gmail: str
    operador: Optional[str]
    plan: Optional[str]
    proveedor: Optional[str]
    activo_id: Optional[int]
    activo_nombre: Optional[str]  # Ej: "Samsung A54"
    empleado_id: Optional[int]
    empleado_nombre: Optional[str]  # Ej: "Juan Pérez"
    fecha_asignacion: Optional[datetime]
    is_active: bool
    observaciones: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class LineaPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[LineaResponse]


class LineaHistorialResponse(BaseModel):
    id: int
    tipo_cambio: str
    activo_anterior_nombre: Optional[str]
    activo_nuevo_nombre: Optional[str]
    empleado_anterior_nombre: Optional[str]
    empleado_nuevo_nombre: Optional[str]
    observaciones: Optional[str]
    registrado_por_nombre: Optional[str]
    fecha_cambio: datetime

    class Config:
        from_attributes = True


class OperationResult(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None


class LineaDropdown(BaseModel):
    id: int
    numero: str
    gmail: str
