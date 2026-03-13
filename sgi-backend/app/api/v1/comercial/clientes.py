from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

# Importaciones de base de datos y esquemas
from app.database.db_connection import get_db
from app.schemas.comercial.cliente import (
    ClienteCreate, 
    ClienteUpdate, 
    ClienteMarcarCaido, 
    ClienteCambiarEstado
)
from app.services.comercial.clientes_service import ClientesService
from app.services.comercial.analytics_service import AnalyticsService

# Importaciones de seguridad refinada
from app.core.security import (
    get_current_user_id, 
    get_current_empleado_id, 
    get_current_token_payload, 
    get_current_active_auth
)
from app.core.dependencies import require_permission, resolver_comercial_ids

from sqlalchemy import and_

router = APIRouter(prefix="/clientes", tags=["Clientes"])

# Lista de roles que pueden ver información global (admin/gerencia/sistemas)
ALLOWED_ALL = ["ADMIN", "GERENCIA", "SISTEMAS", "JEFE_COMERCIAL"]

@router.get("/recordatorios", dependencies=[Depends(require_permission("clientes.listar"))])
async def get_recordatorios(
    days: int = Query(5, ge=1, le=30, description="Días a futuro para buscar"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Obtiene recordatorios de llamadas. Filtrado por equipo automáticamente."""
    service = ClientesService(db)
    return await service.get_recordatorios(comercial_ids=comercial_ids, days=days)


@router.get("/stats", dependencies=[Depends(require_permission("clientes.listar"))])
async def get_clientes_stats(
    comercial_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Estadísticas generales de clientes con filtro por equipo."""
    service = ClientesService(db)
    
    # Si se especifica un comercial_id explícito Y el usuario puede verlo
    if comercial_id:
        # Si comercial_ids es None (ve todo) o el id solicitado está en su equipo
        if comercial_ids is None or comercial_id in comercial_ids:
            comercial_ids = [comercial_id]
        # Si no tiene acceso, se mantiene el filtro de equipo (ignora el param)

    return await service.get_stats(comercial_ids=comercial_ids)


@router.get("/metricas/dashboard", dependencies=[Depends(require_permission("clientes.listar"))])
async def get_dashboard(
    fecha_inicio: date = Query(..., description="Fecha de inicio del reporte (YYYY-MM-DD)"),
    fecha_fin: date = Query(..., description="Fecha de fin del reporte (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_token_payload),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Dashboard completo de métricas. Solo para Sistemas/Gerencia/Jefe Comercial."""
    roles = current_user.get("roles", [])
    if not any(role in roles for role in ALLOWED_ALL):
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder al dashboard")
    
    if fecha_inicio > fecha_fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser posterior a la fecha de fin")
    
    service = AnalyticsService(db)
    return await service.get_dashboard(fecha_inicio, fecha_fin, comercial_ids=comercial_ids)


@router.get("", dependencies=[Depends(require_permission("clientes.listar"))])
async def listar_clientes(
    busqueda: Optional[str] = Query(None, description="Buscar por RUC o razón social"),
    tipo_estado: Optional[str] = Query(None, description="Filtrar por estado"),
    comercial_id: Optional[int] = Query(None, description="Filtrar por comercial"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Lista clientes con paginación. Filtrado por equipo automáticamente."""
    service = ClientesService(db)
    
    # Si se especifica un comercial_id explícito Y el usuario puede verlo
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            comercial_ids = [comercial_id]

    return await service.get_all(
        busqueda=busqueda,
        tipo_estado=tipo_estado,
        comercial_ids=comercial_ids,
        area_id=area_id,
        page=page,
        page_size=page_size
    )


@router.get("/{id}", dependencies=[Depends(require_permission("clientes.listar"))])
async def obtener_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """Obtiene el detalle de un cliente. Protegido por autenticación."""
    service = ClientesService(db)
    cliente = await service.get_by_id(id)
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # NOTA SENIOR: Aquí podrías añadir lógica para que un comercial 
    # no pueda ver el detalle de un cliente que no le pertenece.
    
    return cliente


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("clientes.crear"))])
async def crear_cliente(
    cliente: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Registra un nuevo cliente asignando automáticamente al creador."""
    service = ClientesService(db)
    result = await service.create(
        cliente=cliente, 
        comercial_id=current_user_id,
        created_by=current_user_id
    )
        
    return result


@router.put("/{id}", dependencies=[Depends(require_permission("clientes.editar"))])
async def actualizar_cliente(
    id: int,
    cliente: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Actualiza datos de un cliente existente."""
    service = ClientesService(db)
    result = await service.update(id, cliente, updated_by=current_user_id)
        
    return result


@router.delete("/{id}", dependencies=[Depends(require_permission("clientes.desactivar"))])
async def desactivar_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Desactivación lógica (Soft Delete) del cliente."""
    service = ClientesService(db)
    result = await service.delete(id, updated_by=current_user_id)
        
    return result


@router.post("/{id}/cambiar-estado", dependencies=[Depends(require_permission("clientes.editar"))])
async def cambiar_estado(
    id: int,
    estado_data: ClienteCambiarEstado,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Cambia el estado del cliente con validación de máquina de estados."""
    service = ClientesService(db)
    result = await service.cambiar_estado(
        id, 
        estado_data.nuevo_estado, 
        updated_by=current_user_id,
        motivo=estado_data.motivo
    )
        
    return result


@router.post("/{id}/marcar-caido", dependencies=[Depends(require_permission("clientes.editar"))])
async def marcar_caido(
    id: int,
    data: ClienteMarcarCaido,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Marca como CAIDO. Si tiene fecha seguimiento es recuperable, sino se archiva."""
    service = ClientesService(db)
    result = await service.marcar_caido(
        id, 
        motivo=data.motivo_caida, 
        fecha_seguimiento=data.fecha_seguimiento_caida, 
        updated_by=current_user_id
    )
        
    return result


@router.post("/{id}/reactivar", dependencies=[Depends(require_permission("clientes.editar"))])
async def reactivar_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Reactiva un cliente CAIDO o INACTIVO."""
    service = ClientesService(db)
    result = await service.reactivar(id, updated_by=current_user_id)
        
    return result


@router.post("/{id}/archivar", dependencies=[Depends(require_permission("clientes.desactivar"))])
async def archivar_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Archiva un cliente a INACTIVO y desactiva sus contactos."""
    service = ClientesService(db)
    result = await service.archivar(id, updated_by=current_user_id)
        
    return result


# =========================================================================
# ENDPOINTS DE HISTORIAL Y ANALYTICS
# =========================================================================

@router.get("/{id}/historial", dependencies=[Depends(require_permission("clientes.listar"))])
async def obtener_historial(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la línea de tiempo completa de transiciones del cliente."""
    service = ClientesService(db)
    return await service.get_historial(id)