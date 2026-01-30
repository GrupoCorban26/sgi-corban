from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database.db_connection import get_db
from app.services.organizacion.lineas import LineaService
from app.schemas.organizacion.lineas import (
    LineaCreate,
    LineaUpdate,
    LineaPaginationResponse,
    LineaHistorialResponse,
    OperationResult,
    LineaDropdown,
    CambiarCelularRequest,
    AsignarEmpleadoRequest
)
from app.core.security import get_current_user_id, get_current_active_auth


router = APIRouter(prefix="/lineas", tags=["Organización - Líneas Corporativas"])


@router.get("/", response_model=LineaPaginationResponse)
async def listar_lineas(
    busqueda: Optional[str] = Query(None, description="Buscar por número, gmail u operador"),
    empleado_id: Optional[int] = Query(None, description="Filtrar por empleado asignado"),
    solo_disponibles: Optional[bool] = Query(None, description="True=sin asignar, False=asignadas"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todas las líneas corporativas con paginación y filtros"""
    service = LineaService(db)
    return await service.get_all(
        busqueda=busqueda,
        empleado_id=empleado_id,
        solo_disponibles=solo_disponibles,
        page=page,
        page_size=page_size
    )


@router.get("/dropdown", response_model=List[LineaDropdown])
async def get_lineas_disponibles_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene lista de líneas disponibles (sin asignar) para dropdown"""
    service = LineaService(db)
    return await service.get_dropdown()


@router.get("/{linea_id}", response_model=dict)
async def obtener_linea(
    linea_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene una línea por su ID"""
    service = LineaService(db)
    result = await service.get_by_id(linea_id)
    if not result:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    return result


@router.get("/{linea_id}/historial", response_model=List[LineaHistorialResponse])
async def obtener_historial_linea(
    linea_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene el historial de cambios de una línea"""
    service = LineaService(db)
    return await service.get_historial(linea_id)


@router.post("/", response_model=OperationResult, status_code=201)
async def crear_linea(
    linea: LineaCreate,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Crea una nueva línea corporativa"""
    service = LineaService(db)
    return await service.create(linea, usuario_id=usuario_id)


@router.put("/{linea_id}", response_model=OperationResult)
async def actualizar_linea(
    linea_id: int,
    linea: LineaUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Actualiza datos básicos de una línea"""
    service = LineaService(db)
    return await service.update(linea_id, linea)


@router.post("/{linea_id}/cambiar-celular", response_model=OperationResult)
async def cambiar_celular_linea(
    linea_id: int,
    request: CambiarCelularRequest,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Mueve la línea a otro celular (cuando el anterior se daña)"""
    service = LineaService(db)
    return await service.cambiar_celular(linea_id, request, usuario_id=usuario_id)


@router.post("/{linea_id}/asignar", response_model=OperationResult)
async def asignar_linea_empleado(
    linea_id: int,
    request: AsignarEmpleadoRequest,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Asigna una línea a un empleado"""
    service = LineaService(db)
    return await service.asignar_empleado(linea_id, request, usuario_id=usuario_id)


@router.post("/{linea_id}/desasignar", response_model=OperationResult)
async def desasignar_linea_empleado(
    linea_id: int,
    observaciones: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Desasigna una línea del empleado actual"""
    service = LineaService(db)
    return await service.desasignar_empleado(linea_id, observaciones, usuario_id=usuario_id)


@router.delete("/{linea_id}", response_model=OperationResult)
async def dar_baja_linea(
    linea_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Da de baja una línea (soft delete)"""
    service = LineaService(db)
    return await service.delete(linea_id, usuario_id=usuario_id)
