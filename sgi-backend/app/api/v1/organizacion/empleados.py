from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.organizacion.empleados import EmpleadoService
from app.schemas.organizacion.empleados import (
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
    busqueda: Optional[str] = Query(None, description="Buscar por nombre, apellido o documento"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    departamento_id: Optional[int] = Query(None, description="Filtrar por departamento organizacional"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
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


@router.get("/dropdown/by-area/{area_id}", response_model=List[dict])
async def get_empleados_dropdown_by_area(
    area_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene empleados filtrados por área para dropdown"""
    service = EmpleadoService(db)
    return await service.get_dropdown_by_area(area_id)


@router.get("/dropdown/by-departamento/{departamento_id}", response_model=List[dict])
async def get_empleados_dropdown_by_departamento(
    departamento_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene empleados filtrados por departamento para dropdown"""
    service = EmpleadoService(db)
    return await service.get_dropdown_by_departamento(departamento_id)


@router.get("/{empleado_id}", response_model=dict)
async def obtener_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene un empleado por su ID"""
    service = EmpleadoService(db)
    result = await service.get_by_id(empleado_id)
    if not result:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return result


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_empleado(
    empleado: EmpleadoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo empleado. Validaciones en Python."""
    service = EmpleadoService(db)
    return await service.create(empleado)


@router.put("/{empleado_id}", response_model=OperationResult)
async def actualizar_empleado(
    empleado_id: int,
    empleado: EmpleadoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un empleado existente. Validaciones en Python."""
    service = EmpleadoService(db)
    return await service.update(empleado_id, empleado)


@router.delete("/{empleado_id}", response_model=OperationResult)
async def desactivar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Desactiva un empleado (soft delete) - asigna fecha_cese automáticamente.
    Valida que no sea jefe de otros o responsable de departamento/área.
    """
    service = EmpleadoService(db)
    return await service.delete(empleado_id)


@router.post("/{empleado_id}/reactivar", response_model=OperationResult)
async def reactivar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Reactiva un empleado desactivado - limpia fecha_cese"""
    service = EmpleadoService(db)
    return await service.reactivate(empleado_id)
