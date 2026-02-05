from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class CargoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)
    area_id: int


class CargoCreate(CargoBase):
    """Schema para crear un cargo"""
    pass


class CargoUpdate(CargoBase):
    nombre: Optional[str] = None,
    descripcion: Optional[str] = None,
    area_id: Optional[int] = None


class CargoResponse(BaseModel):
    """Schema de respuesta con datos completos"""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    area_id: int
    area_nombre: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CargoPaginationResponse(BaseModel):
    """Respuesta paginada de cargos"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[CargoResponse]


class OperationResult(BaseModel):
    """Respuesta genérica para operaciones CRUD"""
    success: bool
    message: str
    id: Optional[int] = None


class CargoDropdown(BaseModel):
    """Schema para dropdown de cargos"""
    id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)