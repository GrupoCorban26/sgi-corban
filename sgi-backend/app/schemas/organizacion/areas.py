from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- ESQUEMA BASE ---
class AreaBase(BaseModel):
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
    departamento_id: Optional[int] = Field(
        None, 
        description="ID del área superior (para jerarquías)"
    )
    area_parent_id: Optional[int] = Field(
        None, 
        description="ID del área superior (para jerarquías)"
    )
    responsable_id: Optional[int] = Field(
        None, 
        description="ID del empleado a cargo"
    )

# --- ESQUEMA PARA GUARDAR (POST/PUT) ---
class AreaCreate(AreaBase):
    pass

# --- ESQUEMA PARA EDITAR
class AreaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    departamento_id: Optional[int] = None
    area_padre_name: Optional[int] = None
    responsable_id: Optional[int] = None
    is_active: Optional[bool] = None

# --- ESQUEMA PARA RESPUESTA (LECTURA) ---
class AreaResponse(AreaBase):
    id: int
    is_active: bool
    responsable_name: Optional[str] = "Sin responsable"
    departamento_name: Optional[str] = "Sin departamento"
    area_padre_name: Optional[str] = "Sin area padre"
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

class AreasDropDown(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)