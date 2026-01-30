from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.organizacion.estado_activo import EstadoActivoService
from app.schemas.organizacion.estado_activo import (
    EstadoActivoCreate, 
    EstadoActivoUpdate,
    EstadoActivoResponse,
    EstadoActivoDropdown,
    OperationResult
)

router = APIRouter(prefix="/estados-activo", tags=["Organización - Estados de Activo"])


@router.get("/", response_model=dict)
async def listar_estados(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todos los estados de activo con paginación"""
    service = EstadoActivoService(db)
    return await service.get_all(busqueda=busqueda, page=page, page_size=page_size)


@router.get("/dropdown", response_model=List[EstadoActivoDropdown])
async def get_estados_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene lista de estados para dropdown"""
    service = EstadoActivoService(db)
    return await service.get_dropdown()


@router.get("/{estado_id}", response_model=dict)
async def obtener_estado(
    estado_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene un estado por su ID"""
    service = EstadoActivoService(db)
    result = await service.get_by_id(estado_id)
    if not result:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    return result


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_estado(
    estado: EstadoActivoCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Crea un nuevo estado de activo"""
    service = EstadoActivoService(db)
    return await service.create(estado)


@router.put("/{estado_id}", response_model=OperationResult)
async def actualizar_estado(
    estado_id: int,
    estado: EstadoActivoUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Actualiza un estado de activo"""
    service = EstadoActivoService(db)
    return await service.update(estado_id, estado)


@router.delete("/{estado_id}", response_model=OperationResult)
async def eliminar_estado(
    estado_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Elimina un estado de activo (solo si no está en uso)"""
    service = EstadoActivoService(db)
    return await service.delete(estado_id)
