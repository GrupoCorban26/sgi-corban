from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.organizacion.empleados import EmpleadoService
from app.schemas.organizacion.empleado import (
    EmpleadoCreate, 
    EmpleadoUpdate, 
    EmpleadoPaginationResponse,
    OperationResult,
    EmpleadoResponse,
    EmpleadoDropdown
)

router = APIRouter(prefix="/empleados", tags=["Organización - Empleados"])

@router.get("/", response_model=EmpleadoPaginationResponse)
async def listar_empleados(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre o apellido"),
    departamento_id: Optional[int] = Query(None, description="Filtrar por departamento organizacional"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los empleados con paginación y filtros"""
    service = EmpleadoService(db)
    return await service.get_all(
        busqueda=busqueda, 
        departamento_id=departamento_id, 
        area_id=area_id, 
        page=page, 
        page_size=page_size
    )

@router.get("/dropdown", response_model=List[EmpleadoDropdown])
async def get_empleados_dropdown(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene lista simple de empleados para dropdown"""
    service = EmpleadoService(db)
    return await service.get_dropdown()

@router.post("/", response_model=OperationResult)
async def crear_empleado(
    empleado: EmpleadoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo empleado"""
    service = EmpleadoService(db)
    result = await service.create(empleado)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al crear empleado")
        )
    return result

@router.put("/{empleado_id}", response_model=OperationResult)
async def actualizar_empleado(
    empleado_id: int,
    empleado: EmpleadoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un empleado existente"""
    service = EmpleadoService(db)
    result = await service.update(empleado_id, empleado)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al actualizar empleado")
        )
    return result

@router.delete("/{empleado_id}", response_model=OperationResult)
async def desactivar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Desactiva un empleado (soft delete)"""
    service = EmpleadoService(db)
    result = await service.delete(empleado_id)
    if result.get("success") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Error al desactivar empleado")
        )
    return result
