from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_empleado_id, get_current_active_auth
from app.services.comercial.citas_service import CitasService
from app.services.logistica.transportista_service import LogisticaService
from app.schemas.comercial.cita import (
    CitaCreate, CitaUpdate, CitaResponse, CitaAprobar, CitaRechazar,
    SalidaCampoCreate, SalidaCampoUpdate
)

router = APIRouter(prefix="/citas", tags=["Citas"])


# ============================================================
# LISTAR CITAS
# ============================================================

@router.get("", response_model=dict)
async def listar_citas(
    comercial_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_agenda: Optional[str] = Query(None),  # INDIVIDUAL, SALIDA_CAMPO
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todas las citas con filtros opcionales"""
    service = CitasService(db)
    return await service.get_all(comercial_id, estado, tipo_agenda, page, page_size)


@router.get("/{id}")
async def obtener_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene una cita por ID"""
    service = CitasService(db)
    cita = await service.get_by_id(id)
    if not cita:
        raise HTTPException(404, "Cita no encontrada")
    return cita


# ============================================================
# CREAR CITAS
# ============================================================

@router.post("", response_model=dict)
async def crear_cita(
    data: CitaCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Crea una cita individual (comercial con cliente)
    
    - Requiere: cliente_id, fecha, hora, tipo_cita, motivo
    - Estado inicial: PENDIENTE (requiere aprobación del jefe)
    """
    service = CitasService(db)
    return await service.create(data, comercial_id=current_user_id, created_by=current_user_id)


@router.post("/salida-campo", response_model=dict)
async def crear_salida_campo(
    data: SalidaCampoCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    auth_data: dict = Depends(get_current_active_auth)
):
    """Crea una salida a campo (solo jefe comercial)
    
    - Sin cliente específico
    - Permite seleccionar múltiples comerciales
    - Estado inicial: APROBADO (auto-aprobado por el jefe)
    """
    # Validar rol
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "Solo el jefe comercial puede crear salidas a campo")
    
    if not data.comerciales_ids or len(data.comerciales_ids) == 0:
        raise HTTPException(400, "Debe seleccionar al menos un comercial")
    
    service = CitasService(db)
    return await service.create_salida_campo(data, creador_id=current_user_id)


# ============================================================
# ACTUALIZAR CITAS
# ============================================================

@router.put("/{id}", response_model=dict)
async def actualizar_cita(
    id: int,
    data: CitaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Actualiza una cita individual (vuelve a estado PENDIENTE)"""
    service = CitasService(db)
    return await service.update(id, data, updated_by=current_user_id)


@router.put("/salida-campo/{id}", response_model=dict)
async def actualizar_salida_campo(
    id: int,
    data: SalidaCampoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    auth_data: dict = Depends(get_current_active_auth)
):
    """Actualiza una salida a campo (solo jefe comercial)"""
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "Solo el jefe comercial puede modificar salidas a campo")
    
    service = CitasService(db)
    return await service.update_salida_campo(id, data, updated_by=current_user_id)


# ============================================================
# WORKFLOW: APROBAR / RECHAZAR / TERMINAR
# ============================================================

@router.post("/{id}/aprobar")
async def aprobar_cita(
    id: int,
    data: CitaAprobar,
    db: AsyncSession = Depends(get_db),
    auth_data: dict = Depends(get_current_active_auth)
):
    """Aprueba una cita individual (solo jefe comercial)
    
    - Puede asignar un acompañante o marcar "irá solo"
    - Conductor es opcional
    """
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "No tiene permisos para aprobar citas")
    
    service = CitasService(db)
    return await service.aprobar(id, data)


@router.post("/{id}/rechazar")
async def rechazar_cita(
    id: int,
    data: CitaRechazar,
    db: AsyncSession = Depends(get_db),
    auth_data: dict = Depends(get_current_active_auth)
):
    """Rechaza una cita (solo jefe comercial)
    
    - Requiere motivo de rechazo
    """
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "No tiene permisos para rechazar citas")
    
    if not data.motivo_rechazo or not data.motivo_rechazo.strip():
        raise HTTPException(400, "Debe especificar el motivo del rechazo")
    
    service = CitasService(db)
    return await service.rechazar(id, data.motivo_rechazo)


@router.post("/{id}/terminar")
async def terminar_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Finaliza una cita (solo el día de la cita)"""
    service = CitasService(db)
    return await service.terminar(id)


# ============================================================
# ELIMINAR
# ============================================================

@router.delete("/{id}")
async def eliminar_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    auth_data: dict = Depends(get_current_active_auth)
):
    """Elimina una cita (solo jefe comercial o admin)"""
    roles = auth_data.get("roles", [])
    if not any(rol in ["JEFE_COMERCIAL", "ADMIN", "GERENTE"] for rol in roles):
        raise HTTPException(403, "No tiene permisos para eliminar citas")
    
    service = CitasService(db)
    return await service.delete(id)


# ============================================================
# ENDPOINTS AUXILIARES
# ============================================================

@router.get("/dropdown/comerciales")
async def listar_comerciales_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista comerciales disponibles para selección en salidas a campo"""
    from sqlalchemy import select
    from app.models.seguridad import Usuario
    from app.models.administrativo import Empleado
    
    stmt = select(
        Usuario.id,
        Empleado.nombres,
        Empleado.apellido_paterno
    ).join(Empleado, Usuario.empleado_id == Empleado.id)\
     .where(Usuario.is_active == True)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "id": row.id,
            "nombre": f"{row.nombres} {row.apellido_paterno}"
        }
        for row in rows
    ]


@router.get("/conductores", tags=["Logistica"])
async def listar_conductores(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista conductores disponibles (opcional para citas)"""
    service = LogisticaService(db)
    return await service.get_conductores_activos()
