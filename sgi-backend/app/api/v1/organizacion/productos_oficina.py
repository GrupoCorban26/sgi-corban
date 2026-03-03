from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database.db_connection import get_db
from app.services.organizacion.productos_oficina import ProductoOficinaService
from app.schemas.organizacion.productos_oficina import (
    ProductoOficinaCreate,
    ProductoOficinaUpdate,
    ProductoOficinaResponse,
    ProductoOficinaPaginationResponse,
    AjusteStockRequest,
    OperationResult,
    CategoriaProductoOficinaCreate,
    CategoriaProductoOficinaUpdate,
    CategoriaProductoOficinaResponse,
)
from app.core.security import get_current_active_auth

router = APIRouter(prefix="/productos-oficina", tags=["Organización - Productos de Oficina"])


# ============================================================
# ENDPOINTS DE PRODUCTOS
# ============================================================

@router.get("/", response_model=ProductoOficinaPaginationResponse)
async def listar_productos(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre, ubicación o categoría"),
    categoria_id: Optional[int] = Query(None, description="Filtrar por categoría"),
    solo_stock_bajo: bool = Query(False, description="Solo mostrar con stock bajo"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista todos los productos de oficina con paginación y filtros"""
    return await ProductoOficinaService.listar_productos(
        db=db,
        busqueda=busqueda,
        categoria_id=categoria_id,
        solo_stock_bajo=solo_stock_bajo,
        page=page,
        page_size=page_size,
    )


@router.get("/{producto_id}", response_model=ProductoOficinaResponse)
async def obtener_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene un producto por su ID"""
    producto = await ProductoOficinaService.obtener_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.post("/", response_model=OperationResult)
async def crear_producto(
    producto: ProductoOficinaCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Crea un nuevo producto de oficina"""
    return await ProductoOficinaService.crear_producto(db, producto.model_dump())


@router.put("/{producto_id}", response_model=OperationResult)
async def actualizar_producto(
    producto_id: int,
    producto: ProductoOficinaUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza un producto existente"""
    resultado = await ProductoOficinaService.actualizar_producto(
        db, producto_id, producto.model_dump(exclude_unset=True)
    )
    if not resultado["success"]:
        raise HTTPException(status_code=404, detail=resultado["message"])
    return resultado


@router.delete("/{producto_id}", response_model=OperationResult)
async def eliminar_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Da de baja un producto (soft delete)"""
    resultado = await ProductoOficinaService.eliminar_producto(db, producto_id)
    if not resultado["success"]:
        raise HTTPException(status_code=404, detail=resultado["message"])
    return resultado


@router.patch("/{producto_id}/stock", response_model=OperationResult)
async def ajustar_stock(
    producto_id: int,
    ajuste: AjusteStockRequest,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Ajusta el stock de un producto (cantidad positiva=entrada, negativa=salida)"""
    resultado = await ProductoOficinaService.ajustar_stock(
        db, producto_id, ajuste.cantidad, ajuste.motivo
    )
    if not resultado["success"]:
        raise HTTPException(status_code=400, detail=resultado["message"])
    return resultado


# ============================================================
# ENDPOINTS DE CATEGORÍAS
# ============================================================

@router.get("/categorias/", response_model=list[CategoriaProductoOficinaResponse])
async def listar_categorias(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista todas las categorías activas"""
    return await ProductoOficinaService.listar_categorias(db)


@router.post("/categorias/", response_model=OperationResult)
async def crear_categoria(
    categoria: CategoriaProductoOficinaCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Crea una nueva categoría"""
    resultado = await ProductoOficinaService.crear_categoria(db, categoria.model_dump())
    if not resultado["success"]:
        raise HTTPException(status_code=400, detail=resultado["message"])
    return resultado


@router.put("/categorias/{categoria_id}", response_model=OperationResult)
async def actualizar_categoria(
    categoria_id: int,
    categoria: CategoriaProductoOficinaUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza una categoría"""
    resultado = await ProductoOficinaService.actualizar_categoria(
        db, categoria_id, categoria.model_dump(exclude_unset=True)
    )
    if not resultado["success"]:
        raise HTTPException(status_code=400, detail=resultado["message"])
    return resultado


@router.delete("/categorias/{categoria_id}", response_model=OperationResult)
async def eliminar_categoria(
    categoria_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Elimina una categoría (no permite si tiene productos asociados)"""
    resultado = await ProductoOficinaService.eliminar_categoria(db, categoria_id)
    if not resultado["success"]:
        raise HTTPException(status_code=400, detail=resultado["message"])
    return resultado
