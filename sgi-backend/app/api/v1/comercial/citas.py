from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_empleado_id, get_current_active_auth
from app.services.comercial.citas_service import CitasService
from app.services.logistica.transportista_service import LogisticaService
from app.schemas.comercial.cita import CitaCreate, CitaUpdate, CitaResponse, CitaAprobar, CitaRechazar

router = APIRouter(prefix="/citas", tags=["Citas"])

@router.get("", response_model=dict)
async def listar_citas(
    comercial_id: int = Query(None),
    estado: str = Query(None),
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    service = CitasService(db)
    return await service.get_all(comercial_id, estado, page, page_size)

@router.post("", response_model=CitaResponse)
async def crear_cita(
    data: CitaCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    empleado_id: int = Depends(get_current_empleado_id)
):
    service = CitasService(db)
    # Asignamos al creador como el comercial (usuario actual)
    return await service.create(data, comercial_id=current_user_id, created_by=current_user_id)

@router.put("/{id}", response_model=CitaResponse)
async def actualizar_cita(
    id: int,
    data: CitaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    service = CitasService(db)
    return await service.update(id, data, updated_by=current_user_id)

@router.post("/{id}/aprobar")
async def aprobar_cita(
    id: int,
    data: CitaAprobar,
    db: AsyncSession = Depends(get_db),
    auth_data: dict = Depends(get_current_active_auth)
):
    # Validar que el usuario tenga rol JEFE_COMERCIAL o ADMIN
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "No tiene permisos para aprobar citas. Se requiere rol JEFE_COMERCIAL, GERENTE o ADMIN")
    
    if not data.conductor_id:
        raise HTTPException(400, "Debe asignar un conductor/vehículo")
        
    service = CitasService(db)
    return await service.aprobar(id, data.acompanado_por_id, data.conductor_id)

@router.post("/{id}/rechazar")
async def rechazar_cita(
    id: int,
    data: CitaRechazar,
    db: AsyncSession = Depends(get_db),
    auth_data: dict = Depends(get_current_active_auth)
):
    # Validar que el usuario tenga rol JEFE_COMERCIAL o ADMIN
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "No tiene permisos para rechazar citas. Se requiere rol JEFE_COMERCIAL, GERENTE o ADMIN")
    
    service = CitasService(db)
    return await service.rechazar(id, data.motivo_rechazo)

@router.post("/{id}/terminar")
async def terminar_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    service = CitasService(db)
    return await service.terminar(id)

# --- Logistica Helper Endpoints ---

@router.get("/conductores", tags=["Logistica"])
async def listar_conductores(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    service = LogisticaService(db)
    return await service.get_conductores_activos()

# NOTA: El endpoint seed-logistica fue eliminado por seguridad (era de desarrollo)
