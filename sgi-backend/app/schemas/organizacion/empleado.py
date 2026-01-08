from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, List

# ============================================
# Schemas para Empleados
# ============================================

class EmpleadoBase(BaseModel):
    nombres: str = Field(..., max_length=100)
    apellido_paterno: str = Field(..., max_length=75)
    apellido_materno: Optional[str] = Field(None, max_length=75)
    fecha_nacimiento: Optional[date] = None
    tipo_documento: str = Field("DNI", max_length=20)
    nro_documento: str = Field(..., min_length=8, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    email_personal: Optional[EmailStr] = None
    distrito_id: int
    direccion: Optional[str] = Field(None, max_length=200)
    fecha_ingreso: date
    cargo_id: int
    area_id: int
    departamento_id: int
    jefe_id: Optional[int] = None

class EmpleadoCreate(EmpleadoBase):
    """Schema para crear empleado"""
    fecha_cese: Optional[date] = None
    activo: bool = True

class EmpleadoUpdate(BaseModel):
    """Schema para actualizar empleado - todos los campos opcionales"""
    nombres: Optional[str] = Field(None, max_length=100)
    apellido_paterno: Optional[str] = Field(None, max_length=75)
    apellido_materno: Optional[str] = Field(None, max_length=75)
    fecha_nacimiento: Optional[date] = None
    tipo_documento: Optional[str] = Field(None, max_length=20)
    nro_documento: Optional[str] = Field(None, min_length=8, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    email_personal: Optional[EmailStr] = None
    distrito_id: Optional[int] = None
    direccion: Optional[str] = Field(None, max_length=200)
    fecha_ingreso: Optional[date] = None
    fecha_cese: Optional[date] = None
    activo: Optional[bool] = None
    cargo_id: Optional[int] = None
    area_id: Optional[int] = None
    departamento_id: Optional[int] = None
    jefe_id: Optional[int] = None

class EmpleadoResponse(BaseModel):
    """Schema de respuesta con datos completos"""
    id: int
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    tipo_documento: Optional[str] = None
    nro_documento: Optional[str] = None
    celular: Optional[str] = None
    email_personal: Optional[str] = None
    distrito_id: Optional[int] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None  # Departamento geográfico
    direccion: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_cese: Optional[date] = None
    activo: bool = True
    cargo_id: Optional[int] = None
    cargo_nombre: Optional[str] = None
    area_id: Optional[int] = None
    area_nombre: Optional[str] = None
    departamento_id: Optional[int] = None
    departamento_nombre: Optional[str] = None  # Departamento organizacional
    jefe_id: Optional[int] = None
    jefe_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class EmpleadoPaginationResponse(BaseModel):
    """Respuesta paginada de empleados"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[EmpleadoResponse]

class OperationResult(BaseModel):
    """Respuesta genérica para operaciones CRUD"""
    success: int
    message: str
    id: Optional[int] = None

class EmpleadoDropdown(BaseModel):
    """Schema para dropdown de empleados"""
    id: int
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    nombre_completo: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)