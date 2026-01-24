from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class AreaBase(BaseModel):
    nombre: str = Field(
        ..., 
        min_length=3, 
        max_length=100, 
        examples=["Gerencia Comercial"]
    )
    descripcion: Optional[str] = Field(None, max_length=300)
    departamento_id: int = Field(..., description="ID del departamento")
    area_padre_id: Optional[int] = Field(None, description="ID del área superior")
    responsable_id: Optional[int] = Field(None, description="ID del empleado responsable")


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)
    departamento_id: int
    area_padre_id: Optional[int] = None
    responsable_id: Optional[int] = None


class AreaResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    departamento_id: int
    departamento_nombre: Optional[str] = None
    area_padre_id: Optional[int] = None
    area_padre_nombre: Optional[str] = None
    responsable_id: Optional[int] = None
    responsable_nombre: Optional[str] = "Sin asignar"
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class AreaPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[Any]  # Flexible para evitar errores de validación


class OperationResult(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None


class AreaDropdown(BaseModel):
    id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)


class AreasByDepartamentoDropDown(BaseModel):
    id: int
    departamento_id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)
