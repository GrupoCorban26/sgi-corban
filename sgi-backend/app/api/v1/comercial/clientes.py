from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

# Importaciones de base de datos y esquemas
from app.database.db_connection import get_db
from app.schemas.comercial.cliente import (
    ClienteCreate, 
    ClienteUpdate, 
    ClienteMarcarPerdido, 
    ClienteCambiarEstado
)
from app.services.comercial.clientes_service import ClientesService

# Importaciones de seguridad refinada
from app.core.security import (
    get_current_user_id, 
    get_current_empleado_id, 
    get_current_token_payload, 
    get_current_active_auth
)
from app.core.dependencies import require_permission

router = APIRouter(prefix="/clientes", tags=["Clientes"])

# Lista de roles que pueden ver información de CUALQUIER comercial
ALLOWED_ALL = ["JEFE_COMERCIAL", "ADMIN", "GERENCIA"]

@router.get("/recordatorios", dependencies=[Depends(require_permission("clientes.listar"))])
async def get_recordatorios(
    days: int = Query(5, ge=1, le=30, description="Días a futuro para buscar"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_token_payload)
):
    """Obtiene recordatorios de llamadas. Jefes ven todo, comerciales solo lo suyo."""
    service = ClientesService(db)
    roles = current_user.get("roles", [])
    
    comercial_ids = None
    
    # Si NO es jefe/admin, aplicamos filtro restrictivo por USUARIO
    if not any(role in roles for role in ALLOWED_ALL):
        user_id = int(current_user.get("sub"))
        comercial_ids = [user_id]

    return await service.get_recordatorios(comercial_ids=comercial_ids, days=days)


@router.get("/stats", dependencies=[Depends(require_permission("clientes.listar"))])
async def get_clientes_stats(
    comercial_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_token_payload)
):
    """Estadísticas generales de clientes con filtro de privacidad."""
    service = ClientesService(db)
    roles = current_user.get("roles", [])
    
    comercial_ids = None
    
    # Si no es jefe, forzamos que solo vea sus propias estadísticas (ID Usuario)
    if not any(role in roles for role in ALLOWED_ALL):
        user_id = int(current_user.get("sub"))
        comercial_ids = [user_id]
    elif comercial_id:
        comercial_ids = [comercial_id]

    return await service.get_stats(comercial_ids=comercial_ids)


@router.get("", dependencies=[Depends(require_permission("clientes.listar"))])
async def listar_clientes(
    busqueda: Optional[str] = Query(None, description="Buscar por RUC o razón social"),
    tipo_estado: Optional[str] = Query(None, description="Filtrar por estado"),
    comercial_id: Optional[int] = Query(None, description="Filtrar por comercial"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """Lista clientes con paginación. Los comerciales están limitados a su propia base."""
    service = ClientesService(db)
    roles = current_user.get("roles", [])
    
    comercial_ids = None
    
    # Seguridad a nivel de fila: Si no es jefe, filtro por SU Usuario ID
    if not any(role in roles for role in ALLOWED_ALL):
        user_id = int(current_user.get("sub"))
        comercial_ids = [user_id]
    elif comercial_id:
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
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
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
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
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
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result


@router.post("/{id}/cambiar-estado", dependencies=[Depends(require_permission("clientes.editar"))])
async def cambiar_estado(
    id: int,
    estado_data: ClienteCambiarEstado,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Cambia el estado del cliente (PROSPECTO <-> EN_NEGOCIACION <-> CLIENTE)."""
    service = ClientesService(db)
    result = await service.cambiar_estado(id, estado_data.nuevo_estado, updated_by=current_user_id)
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result


@router.post("/{id}/marcar-perdido", dependencies=[Depends(require_permission("clientes.editar"))])
async def marcar_perdido(
    id: int,
    data: ClienteMarcarPerdido,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Marca como PERDIDO. Si tiene fecha reactivación es temporal, sino se archiva."""
    service = ClientesService(db)
    result = await service.marcar_perdido(
        id, 
        motivo=data.motivo_perdida, 
        fecha_reactivacion=data.fecha_reactivacion, 
        updated_by=current_user_id
    )
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result


@router.post("/{id}/reactivar", dependencies=[Depends(require_permission("clientes.editar"))])
async def reactivar_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Reactiva un cliente PERDIDO o INACTIVO a PROSPECTO."""
    service = ClientesService(db)
    result = await service.reactivar(id, updated_by=current_user_id)
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
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
    
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result