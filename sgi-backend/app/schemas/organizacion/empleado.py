from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional, List

# 1. Schema Base con los nombres exactos de tu SQL
class EmpleadoBase(BaseModel):
    codigo_empleado: str = Field(..., max_length=20)
    nombres: str = Field(..., max_length=100)
    apellido_paterno: str = Field(..., max_length=75)
    apellido_materno: Optional[str] = Field(None, max_length=75)
    tipo_documento: str = Field("DNI", max_length=20)
    nro_documento: str = Field(..., min_length=8, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    email_personal: Optional[EmailStr] = Field(None, max_length=100)
    fecha_ingreso: date
    cargo_id: int
    area_id: int
    jefe_id: Optional[int] = None

# 2. Para creación (añadimos datos de vivienda que pide tu SP)
class EmpleadoCreate(EmpleadoBase):
    fecha_nacimiento: Optional[date] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None

# 3. Para la respuesta (debe coincidir con el SELECT de tu SP)
class EmpleadoResponse(EmpleadoCreate):
    id: int  # SQL devuelve 'id'
    activo: bool # SQL devuelve BIT (0 o 1)
    cargo_nombre: Optional[str] = None
    area_nombre: Optional[str] = None
    jefe_nombre_completo: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# 4. Para la lista paginada (lo que devuelve sp_listar_empleados)
class EmpleadoPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[EmpleadoResponse]

# 5. Para actualización (Todo opcional)
class EmpleadoUpdate(BaseModel):
    nombres: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    celular: Optional[str] = None
    email_personal: Optional[EmailStr] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None
    cargo_id: Optional[int] = None
    area_id: Optional[int] = None
    fecha_cese: Optional[date] = None