from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.organizacion.areas import AreaService
from app.schemas.organizacion.areas import (
    AreaCreate, 
    AreaUpdate, 
    AreaPaginationResponse,
    OperationResult,
    AreaResponse,
    AreasDropDown
)

router = APIRouter(prefix="/areas", tags=["Organización - Areas"])

@router.get("/", response_model=AreaPaginationResponse)
async def listar_areas(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre de area"),
    departamento_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las áreas con paginación y filtros"""
    service = AreaService(db)
    return await service.get_all(busqueda=busqueda, departamento_id=departamento_id, page=page, page_size=page_size)

@router.get("/dropdown", response_model=List[AreasDropDown])
async def get_areas_dropdown(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene lista simple de áreas para dropdown"""
    service = AreaService(db)
    return await service.get_areas_dropdown()

@router.get("/by-departamento/{depto_id}", response_model=List[AreaResponse])
async def listar_areas_por_departamento(
    depto_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todas las áreas de un departamento específico (para expandir en árbol)"""
    service = AreaService(db)
    return await service.get_by_departamento(depto_id)

@router.post("/", response_model=OperationResult)
async def crear_area(
    area: AreaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea una nueva área"""
    service = AreaService(db)
    result = await service.create(area)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al crear área")
        )
    return result

@router.put("/{area_id}", response_model=OperationResult)
async def actualizar_area(
    area_id: int,
    area: AreaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un área existente"""
    service = AreaService(db)
    result = await service.update(area_id, area)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al actualizar área")
        )
    return result

@router.delete("/{area_id}", response_model=OperationResult)
async def desactivar_area(
    area_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Desactiva un área (soft delete)"""
    service = AreaService(db)
    result = await service.delete(area_id)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al desactivar área")
        )
    return result
