from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ============================================================
# Schemas de Categoría de Producto de Oficina
# ============================================================

class CategoriaProductoOficinaBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre de la categoría")
    descripcion: Optional[str] = Field(None, max_length=300)


class CategoriaProductoOficinaCreate(CategoriaProductoOficinaBase):
    """Schema para crear categoría"""
    pass


class CategoriaProductoOficinaUpdate(BaseModel):
    """Schema para actualizar categoría"""
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)


class CategoriaProductoOficinaResponse(BaseModel):
    """Respuesta de categoría"""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    is_active: bool = True
    cantidad_productos: int = 0

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Schemas de Producto de Oficina
# ============================================================

class ProductoOficinaBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre del producto")
    categoria_id: Optional[int] = Field(None, description="FK a categoría")
    unidad_medida: str = Field("unidad", max_length=30, description="unidad, caja, paquete, etc.")
    stock_actual: int = Field(0, ge=0, description="Cantidad disponible")
    stock_minimo: int = Field(0, ge=0, description="Stock mínimo para alerta")
    precio_unitario: Optional[Decimal] = Field(None, ge=0, description="Costo referencial")
    ubicacion: Optional[str] = Field(None, max_length=100, description="Ubicación física")
    observaciones: Optional[str] = None


class ProductoOficinaCreate(ProductoOficinaBase):
    """Schema para crear producto"""
    pass


class ProductoOficinaUpdate(BaseModel):
    """Schema para actualizar producto"""
    nombre: Optional[str] = Field(None, max_length=150)
    categoria_id: Optional[int] = None
    unidad_medida: Optional[str] = Field(None, max_length=30)
    stock_minimo: Optional[int] = Field(None, ge=0)
    precio_unitario: Optional[Decimal] = Field(None, ge=0)
    ubicacion: Optional[str] = Field(None, max_length=100)
    observaciones: Optional[str] = None


class ProductoOficinaResponse(BaseModel):
    """Respuesta completa de producto"""
    id: int
    nombre: str
    categoria_id: Optional[int] = None
    categoria_nombre: Optional[str] = None
    unidad_medida: str = "unidad"
    stock_actual: int = 0
    stock_minimo: int = 0
    precio_unitario: Optional[Decimal] = None
    ubicacion: Optional[str] = None
    observaciones: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductoOficinaPaginationResponse(BaseModel):
    """Respuesta paginada de productos"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[ProductoOficinaResponse]


class AjusteStockRequest(BaseModel):
    """Request para ajustar stock (entrada o salida)"""
    cantidad: int = Field(..., description="Cantidad positiva=entrada, negativa=salida")
    motivo: str = Field(..., max_length=200, description="Razón del ajuste")


class OperationResult(BaseModel):
    """Respuesta genérica de operación"""
    success: bool
    message: str
    id: Optional[int] = None
