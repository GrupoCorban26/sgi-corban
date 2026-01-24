from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class EstadoActivoBase(BaseModel):
    """Campos base para estado de activo"""
    nombre: str = Field(..., min_length=2, max_length=50, description="BUENO, REGULAR, MALOGRADO, etc.")
    descripcion: Optional[str] = Field(None, max_length=300)


class EstadoActivoCreate(EstadoActivoBase):
    """Schema para crear estado"""
    pass


class EstadoActivoUpdate(BaseModel):
    """Schema para actualizar estado"""
    nombre: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=300)


class EstadoActivoResponse(BaseModel):
    """Schema de respuesta"""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class EstadoActivoDropdown(BaseModel):
    """Schema para dropdown de estados"""
    id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)


class OperationResult(BaseModel):
    """Respuesta genérica para operaciones"""
    success: bool
    message: str
    id: Optional[int] = None
