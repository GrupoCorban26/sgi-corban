from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- ESQUEMA BASE ---
class AreaSchema(BaseModel):
    # strip_whitespace elimina espacios al inicio y final automáticamente
    nombre: str = Field(
        ..., 
        min_length=3, 
        max_length=100, 
        examples=["Gerencia Comercial"],
        description="Nombre único del área o departamento"
    )
    descripcion: Optional[str] = Field(
        None, 
        max_length=300, 
        examples=["Encargada de las ventas y pricing"]
    )
    parent_area_id: Optional[int] = Field(
        None, 
        description="ID del área superior (para jerarquías)"
    )
    responsable_id: Optional[int] = Field(
        None, 
        description="ID del empleado a cargo"
    )
    comisiona_ventas: bool = Field(
        False, 
        description="Indica si los empleados de esta área reciben comisiones"
    )
    is_active: bool = True

# --- ESQUEMA PARA GUARDAR (POST/PUT) ---
class AreaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

# --- ESQUEMA PARA EDITAR
class AreaUpdate(AreaCreate):
    area_id: int


# --- ESQUEMA PARA RESPUESTA (LECTURA) ---
class AreaResponse(AreaSchema):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Esto permite que Pydantic lea modelos de SQLAlchemy
    model_config = ConfigDict(from_attributes=True)

# --- ESQUEMA DE PAGINACIÓN ---
class AreaPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[AreaResponse]

    model_config = ConfigDict(from_attributes=True)

# --- RESULTADOS DE OPERACIÓN ---
class OperationResult(BaseModel):
    success: int # 1: Ok, 0: Error
    message: str
    id: Optional[int] = None