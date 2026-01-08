from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db # Ajustado a la ruta común
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
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la lista paginada de departamentos. 
    Permite filtrar por nombre para la búsqueda dinámica del frontend.
    """
    service = DepartamentoService(db)
    # Sincronizado con el service: incluimos 'busqueda'
    return await service.get_all(busqueda=busqueda, page=page, page_size=page_size)

@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_departamento(
    depto: DepartamentoCreate, 
    db: AsyncSession = Depends(get_db)
):
    service = DepartamentoService(db)
    try:
        # Llamamos al service (Recuerda que en el service quitamos el user_id 
        # porque el SP actual no lo recibe aún)
        return await service.create(depto)
    except Exception as e:
        # Aquí capturamos el RAISERROR de SQL Server (ej: 'Nombre duplicado')
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.put("/{depto_id}", response_model=OperationResult)
async def actualizar_departamento(
    depto_id: int, 
    depto: DepartamentoUpdate, 
    db: AsyncSession = Depends(get_db)
):
    service = DepartamentoService(db)
    try:
        return await service.update(depto_id, depto)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.delete("/{depto_id}", response_model=OperationResult)
async def desactivar_departamento(
    depto_id: int,
    estado: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Realiza una desactivación lógica (is_active = 0) del departamento.
    """
    service = DepartamentoService(db)
    try:
        return await service.delete(depto_id, estado=estado)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/dropdown", response_model=List[DepartamentoDropDown])
async def get_departamentos_dropdown(
    db: AsyncSession = Depends(get_db)
):
    service = DepartamentoService(db)
    return await service.get_departamentos_dropdown()