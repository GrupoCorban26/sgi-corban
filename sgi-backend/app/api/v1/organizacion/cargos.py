from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.organizacion.cargos import CargoService
from app.schemas.organizacion.cargo import (
    CargoCreate, 
    CargoUpdate, 
    CargoPaginationResponse,
    OperationResult,
    CargoResponse,
    CargoDropdown
)

router = APIRouter(prefix="/cargos", tags=["Organización - Cargos"])


@router.get("/", response_model=CargoPaginationResponse)
async def listar_cargos(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre de cargo"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los cargos con paginación y filtros"""
    service = CargoService(db)
    return await service.get_all(busqueda=busqueda, area_id=area_id, page=page, page_size=page_size)


@router.get("/dropdown", response_model=List[CargoDropdown])
async def get_cargos_dropdown(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene lista simple de cargos para dropdown"""
    service = CargoService(db)
    return await service.get_dropdown()


@router.get("/dropdown/by-area/{area_id}", response_model=List[dict])
async def get_cargos_dropdown_by_area(
    area_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene cargos filtrados por área para dropdown"""
    service = CargoService(db)
    return await service.get_dropdown_by_area(area_id)


@router.get("/by-area/{area_id}", response_model=List[CargoResponse])
async def listar_cargos_por_area(
    area_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene todos los cargos de un área específica (para expandir en árbol)"""
    service = CargoService(db)
    return await service.get_by_area(area_id)


@router.get("/{cargo_id}", response_model=dict)
async def obtener_cargo(
    cargo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene un cargo por su ID"""
    service = CargoService(db)
    result = await service.get_by_id(cargo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    return result


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_cargo(
    cargo: CargoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo cargo. Validaciones en Python."""
    service = CargoService(db)
    return await service.create(cargo)


@router.put("/{cargo_id}", response_model=OperationResult)
async def actualizar_cargo(
    cargo_id: int,
    cargo: CargoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un cargo existente. Validaciones en Python."""
    service = CargoService(db)
    return await service.update(cargo_id, cargo)


@router.delete("/{cargo_id}", response_model=OperationResult)
async def desactivar_cargo(
    cargo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Desactiva un cargo (soft delete). Valida que no tenga empleados activos."""
    service = CargoService(db)
    return await service.delete(cargo_id)


@router.post("/{cargo_id}/reactivar", response_model=OperationResult)
async def reactivar_cargo(
    cargo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Reactiva un cargo previamente desactivado"""
    service = CargoService(db)
    return await service.reactivate(cargo_id)
