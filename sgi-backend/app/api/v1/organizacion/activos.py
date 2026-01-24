from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.organizacion.activos import ActivoService
from app.schemas.organizacion.activos import (
    ActivoCreate, 
    ActivoUpdate,
    CambioEstadoRequest,
    ActivoPaginationResponse,
    OperationResult,
    ActivoDropdown,
    ActivoHistorialResponse,
    AsignacionActivoRequest,
    DevolucionActivoRequest
)
from app.core.security import get_current_user_id

router = APIRouter(prefix="/activos", tags=["Organización - Activos"])


@router.get("/", response_model=ActivoPaginationResponse)
async def listar_activos(
    busqueda: Optional[str] = Query(None, description="Buscar por producto, marca, modelo, serie o código"),
    estado_id: Optional[int] = Query(None, description="Filtrar por ID de estado"),
    is_disponible: Optional[bool] = Query(None, description="Filtrar por disponibilidad"),
    page: int = Query(1, ge=1), 
    page_size: int = Query(15, ge=1, le=100), 
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los activos con paginación y filtros"""
    service = ActivoService(db)
    return await service.get_all(
        busqueda=busqueda,
        estado_id=estado_id,
        is_disponible=is_disponible,
        page=page,
        page_size=page_size
    )


@router.get("/dropdown", response_model=List[ActivoDropdown])
async def get_activos_disponibles_dropdown(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene lista de activos DISPONIBLES para dropdown (asignación)"""
    service = ActivoService(db)
    return await service.get_dropdown()


@router.get("/dropdown/todos", response_model=List[ActivoDropdown])
async def get_todos_activos_dropdown(
    db: AsyncSession = Depends(get_db)
):
    """Obtiene lista de TODOS los activos para dropdown"""
    service = ActivoService(db)
    return await service.get_dropdown_todos()


@router.get("/{activo_id}", response_model=dict)
async def obtener_activo(
    activo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene un activo por su ID con info de asignación actual"""
    service = ActivoService(db)
    result = await service.get_by_id(activo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    return result


@router.get("/{activo_id}/historial", response_model=List[dict])
async def obtener_historial_activo(
    activo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de cambios de estado de un activo"""
    service = ActivoService(db)
    return await service.get_historial(activo_id)


@router.post("/", response_model=OperationResult, status_code=status.HTTP_201_CREATED)
async def crear_activo(
    activo: ActivoCreate,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """Crea un nuevo activo y registra en historial"""
    service = ActivoService(db)
    return await service.create(activo, usuario_id=usuario_id)


@router.put("/{activo_id}", response_model=OperationResult)
async def actualizar_activo(
    activo_id: int,
    activo: ActivoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza datos de un activo (sin cambiar estado)"""
    service = ActivoService(db)
    return await service.update(activo_id, activo)


@router.post("/{activo_id}/cambiar-estado", response_model=OperationResult)
async def cambiar_estado_activo(
    activo_id: int,
    cambio: CambioEstadoRequest,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """
    Cambia el estado físico de un activo y registra en historial.
    Motivos válidos: REPARACION, DETERIORO, REVISION, BAJA
    """
    service = ActivoService(db)
    return await service.cambiar_estado(activo_id, cambio, usuario_id=usuario_id)


@router.delete("/{activo_id}", response_model=OperationResult)
async def dar_baja_activo(
    activo_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Da de baja un activo (solo si no está asignado)"""
    service = ActivoService(db)
    return await service.delete(activo_id)


@router.post("/{activo_id}/asignar", response_model=OperationResult)
async def asignar_activo_empleado(
    activo_id: int,
    asignacion: AsignacionActivoRequest,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """
    Asigna un activo a un empleado.
    El activo debe estar DISPONIBLE.
    """
    service = ActivoService(db)
    return await service.asignar_a_empleado(activo_id, asignacion, usuario_id=usuario_id)


@router.post("/{activo_id}/devolver", response_model=OperationResult)
async def devolver_activo_empleado(
    activo_id: int,
    devolucion: DevolucionActivoRequest,
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    """
    Registra la devolución de un activo por parte de un empleado.
    El activo queda DISPONIBLE y con el estado físico indicado.
    """
    service = ActivoService(db)
    return await service.devolver_activo(activo_id, devolucion, usuario_id=usuario_id)


@router.get("/empleado/{empleado_id}", response_model=List[dict])
async def listar_activos_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos los activos asignados actualmente a un empleado.
    """
    service = ActivoService(db)
    return await service.get_activos_empleado(empleado_id)
