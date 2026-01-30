from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.organizacion.areas import AreaService
from app.schemas.organizacion.areas import (
    AreaCreate, 
    AreaUpdate, 
    AreaPaginationResponse,
    OperationResult,
    AreaResponse
)

router = APIRouter(prefix="/areas", tags=["Organización - Areas"])


@router.get("/", response_model=AreaPaginationResponse)
async def listar_areas(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre de area"),
    departamento_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todas las áreas con paginación y filtros"""
    service = AreaService(db)
    return await service.get_all(busqueda=busqueda, departamento_id=departamento_id, page=page, page_size=page_size)


@router.get("/dropdown", response_model=List[dict])
async def get_areas_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene lista simple de áreas para dropdown"""
    service = AreaService(db)
    return await service.get_dropdown()


@router.get("/dropdown/by-departamento/{departamento_id}", response_model=List[dict])
async def get_areas_dropdown_by_departamento(
    departamento_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene áreas filtradas por departamento para dropdown"""
    service = AreaService(db)
    return await service.get_dropdown_by_departamento(departamento_id)


@router.get("/by-departamento/{depto_id}", response_model=List[dict])
async def listar_areas_por_departamento(
    depto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene todas las áreas de un departamento específico"""
    service = AreaService(db)
    return await service.get_by_departamento(depto_id)


@router.get("/{area_id}", response_model=dict)
async def obtener_area(
    area_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene un área por su ID"""
    service = AreaService(db)
    result = await service.get_by_id(area_id)
    if not result:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    return result


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_area(
    area: AreaCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Crea una nueva área. Validaciones en Python."""
    service = AreaService(db)
    return await service.create(area)


@router.put("/{area_id}", response_model=OperationResult)
async def actualizar_area(
    area_id: int,
    area: AreaUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Actualiza un área existente. Validaciones en Python."""
    service = AreaService(db)
    return await service.update(area_id, area)


@router.delete("/{area_id}", response_model=OperationResult)
async def desactivar_area(
    area_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Desactiva un área (soft delete). Valida que no tenga sub-áreas o empleados activos."""
    service = AreaService(db)
    return await service.delete(area_id)


@router.post("/{area_id}/reactivar", response_model=OperationResult)
async def reactivar_area(
    area_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Reactiva un área previamente desactivada"""
    service = AreaService(db)
    return await service.reactivate(area_id)
