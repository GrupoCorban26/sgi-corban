from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_empleado_id
from app.services.clientes_service import ClientesService
from app.schemas.cliente import ClienteCreate, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("/dropdown")
async def get_clientes_dropdown(db: AsyncSession = Depends(get_db)):
    """Lista simple de clientes para dropdowns"""
    service = ClientesService(db)
    return await service.get_dropdown()


@router.get("/stats")
async def get_clientes_stats(
    comercial_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Estadísticas de clientes"""
    service = ClientesService(db)
    return await service.get_stats(comercial_id=comercial_id)


@router.get("")
async def listar_clientes(
    busqueda: Optional[str] = Query(None, description="Buscar por RUC o razón social"),
    tipo_estado: Optional[str] = Query(None, description="Filtrar por estado"),
    comercial_id: Optional[int] = Query(None, description="Filtrar por comercial"),
    area_id: Optional[int] = Query(None, description="Filtrar por área"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lista clientes con paginación y filtros"""
    service = ClientesService(db)
    return await service.get_all(
        busqueda=busqueda,
        tipo_estado=tipo_estado,
        comercial_id=comercial_id,
        area_id=area_id,
        page=page,
        page_size=page_size
    )


@router.get("/{id}")
async def obtener_cliente(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene un cliente por ID"""
    service = ClientesService(db)
    cliente = await service.get_by_id(id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.post("")
async def crear_cliente(
    cliente: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    empleado_id: int = Depends(get_current_empleado_id)
):
    """Crea un nuevo cliente - área y comercial se asignan automáticamente"""
    service = ClientesService(db)
    # El comercial es el empleado actual, área se busca automáticamente (Ventas)
    result = await service.create(
        cliente=cliente, 
        comercial_id=empleado_id,
        created_by=current_user_id
    )
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/{id}")
async def actualizar_cliente(
    id: int,
    cliente: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Actualiza un cliente existente"""
    service = ClientesService(db)
    result = await service.update(id, cliente, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.delete("/{id}")
async def desactivar_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Desactiva un cliente (soft delete)"""
    service = ClientesService(db)
    result = await service.delete(id, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
