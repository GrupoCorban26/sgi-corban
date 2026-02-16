from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, List, Any


class EmpleadoBase(BaseModel):
    """Campos base para empleados"""
    nombres: str = Field(..., max_length=100)
    apellido_paterno: str = Field(..., max_length=75)
    apellido_materno: Optional[str] = Field(None, max_length=75)
    fecha_nacimiento: Optional[date] = None
    tipo_documento: str = Field("DNI", max_length=20)
    nro_documento: str = Field(..., min_length=8, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    email_personal: Optional[EmailStr] = None
    distrito_id: Optional[int] = None
    direccion: Optional[str] = Field(None, max_length=200)
    fecha_ingreso: date
    cargo_id: int  # Area y Departamento se derivan del cargo
    jefe_id: Optional[int] = None
    empresa: str = Field("Corban Trans Logistic", max_length=50)


class EmpleadoCreate(EmpleadoBase):
    """Schema para crear empleado - fecha_cese es NULL por defecto"""
    pass


class EmpleadoUpdate(EmpleadoBase):
    """Schema para actualizar empleado - mismos campos requeridos que Create"""
    pass


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
    departamento_ubigeo: Optional[str] = None  # Departamento geográfico
    direccion: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_cese: Optional[date] = None
    is_active: bool = True
    cargo_id: Optional[int] = None
    cargo_nombre: Optional[str] = None
    area_id: Optional[int] = None
    area_nombre: Optional[str] = None
    departamento_id: Optional[int] = None
    departamento_nombre: Optional[str] = None  # Departamento organizacional
    jefe_id: Optional[int] = None
    jefe_nombre: Optional[str] = None
    empresa: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class EmpleadoPaginationResponse(BaseModel):
    """Respuesta paginada de empleados"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[EmpleadoResponse]  # Flexible para evitar errores de validación


class OperationResult(BaseModel):
    """Respuesta genérica para operaciones CRUD"""
    success: bool
    message: str
    id: Optional[int] = None


class EmpleadoDropdown(BaseModel):
    """Schema para dropdown de empleados"""
    id: int
    nombre_completo: str
    
    model_config = ConfigDict(from_attributes=True)
