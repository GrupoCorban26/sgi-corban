from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class DepartamentoBase(BaseModel):
    nombre: str = Field(
        ..., 
        min_length=3, 
        max_length=100, 
        examples=["Departamento Comercial"]
    )
    descripcion: Optional[str] = Field(
        None, 
        max_length=500,
        examples=["Área encargada de ventas y pricing"]
    )
    responsable_id: Optional[int] = Field(
        None, 
        description="ID del empleado a cargo"
    )


class DepartamentoCreate(DepartamentoBase):
    pass


class DepartamentoUpdate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    responsable_id: Optional[int] = None


class DepartamentoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    responsable_id: Optional[int] = None
    responsable_nombre: Optional[str] = "Sin asignar"
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Me permite usar los nombres de las columnas de la tabla como nombres de los atributos del objeto
    model_config = ConfigDict(from_attributes=True)


class DepartamentoPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[DepartamentoResponse]  # Flexible para evitar errores de validación


class OperationResult(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None


class DepartamentoDropDown(BaseModel):
    id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)
