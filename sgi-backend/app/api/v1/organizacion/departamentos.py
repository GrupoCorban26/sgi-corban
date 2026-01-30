from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.organizacion.departamentos import DepartamentoService
from app.schemas.organizacion.departamentos import (
    DepartamentoCreate, 
    DepartamentoUpdate, 
    DepartamentoPaginationResponse,
    OperationResult,
    DepartamentoDropDown
)

router = APIRouter(prefix="/departamentos", tags=["Organización - Departamentos"])


@router.get("/", response_model=DepartamentoPaginationResponse)
async def listar_departamentos(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre de departamento"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Obtiene la lista paginada de departamentos. 
    Permite filtrar por nombre para la búsqueda dinámica del frontend.
    """
    service = DepartamentoService(db)
    return await service.get_all(busqueda=busqueda, page=page, page_size=page_size)


@router.get("/dropdown", response_model=List[DepartamentoDropDown])
async def get_departamentos_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista simple de departamentos para dropdowns"""
    service = DepartamentoService(db)
    return await service.get_dropdown()


@router.get("/{depto_id}", response_model=dict)
async def obtener_departamento(
    depto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene un departamento por su ID"""
    service = DepartamentoService(db)
    result = await service.get_by_id(depto_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departamento no encontrado"
        )
    return result


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_departamento(
    depto: DepartamentoCreate, 
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Crea un nuevo departamento.
    Las validaciones de negocio se realizan en el servicio (Python).
    """
    service = DepartamentoService(db)
    return await service.create(depto)


@router.put("/{depto_id}", response_model=OperationResult)
async def actualizar_departamento(
    depto_id: int, 
    depto: DepartamentoUpdate, 
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Actualiza un departamento existente.
    Las validaciones de negocio se realizan en el servicio (Python).
    """
    service = DepartamentoService(db)
    return await service.update(depto_id, depto)


@router.delete("/{depto_id}", response_model=OperationResult)
async def desactivar_departamento(
    depto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Realiza una desactivación lógica (soft delete) del departamento.
    Valida que no tenga áreas ni empleados activos asignados.
    """
    service = DepartamentoService(db)
    return await service.delete(depto_id)


@router.post("/{depto_id}/reactivar", response_model=OperationResult)
async def reactivar_departamento(
    depto_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Reactiva un departamento previamente desactivado"""
    service = DepartamentoService(db)
    return await service.reactivate(depto_id)