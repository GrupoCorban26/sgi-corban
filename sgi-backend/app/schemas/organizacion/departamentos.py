from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
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

# Para el Update, permitimos que todo sea opcional
class DepartamentoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    responsable_id: Optional[int] = None
    is_active: Optional[bool] = None

class DepartamentoResponse(DepartamentoBase):
    id: int
    # Coincide con el alias que pusimos en el SP (nombre_responsable)
    responsable_name: Optional[str] = "Sin asignar"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class DepartamentoPaginationResponse(BaseModel):
    total: int
    page: int
    registro_por_pagina: int # Alineado con el nombre de variable del SP
    total_pages: int
    data: List[DepartamentoResponse]

class OperationResult(BaseModel):
    success: bool # Cambiado a bool para que FastAPI lo envíe como true/false JSON
    message: str
    id: Optional[int] = None