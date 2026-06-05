from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database.db_connection import get_db
from app.schemas.comercial.incidencia import (
    IncidenciaCreate,
    IncidenciaUpdate,
    IncidenciaResolver,
    IncidenciaResponse
)
from app.services.comercial.incidencias_service import IncidenciasService
from app.core.security import get_current_user_id
from app.core.dependencies import require_permission, resolver_comercial_ids

router = APIRouter(prefix="/incidencias", tags=["Incidencias"])


@router.get("", response_model=List[IncidenciaResponse], dependencies=[Depends(require_permission("incidencias.listar"))])
async def listar_incidencias(
    estado: Optional[str] = Query(None, description="Filtrar por estado: ABIERTA, EN_INVESTIGACION, RESUELTA"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Lista las incidencias operativas con filtro automático de RBAC por equipo."""
    service = IncidenciasService(db)
    return await service.get_all(comercial_ids=comercial_ids, estado=estado)


@router.get("/{id}", response_model=IncidenciaResponse, dependencies=[Depends(require_permission("incidencias.listar"))])
async def obtener_incidencia(
    id: int,
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Obtiene una incidencia operativa específica por su ID. Valida permisos del comercial encargado."""
    service = IncidenciasService(db)
    incidencia = await service.get_by_id(id)
    
    if comercial_ids is not None and incidencia.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta incidencia")
        
    return incidencia


@router.post("", response_model=IncidenciaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("incidencias.crear"))])
async def crear_incidencia(
    data: IncidenciaCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Crea una nueva incidencia operativa asociada a un cliente y opcionalmente a un seguimiento."""
    service = IncidenciasService(db)
    return await service.create(
        data=data,
        comercial_id=current_user_id,
        created_by=current_user_id
    )


@router.put("/{id}", response_model=IncidenciaResponse, dependencies=[Depends(require_permission("incidencias.editar"))])
async def actualizar_incidencia(
    id: int,
    data: IncidenciaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Edita detalles de una incidencia operativa."""
    service = IncidenciasService(db)
    incidencia = await service.get_by_id(id)
    
    if comercial_ids is not None and incidencia.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar esta incidencia")
        
    return await service.update(id=id, data=data, usuario_id=current_user_id)


@router.post("/{id}/resolver", response_model=IncidenciaResponse, dependencies=[Depends(require_permission("incidencias.editar"))])
async def resolver_incidencia(
    id: int,
    data: IncidenciaResolver,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Marca una incidencia operativa como RESUELTA agregando un plan de acción o resolución."""
    service = IncidenciasService(db)
    incidencia = await service.get_by_id(id)
    
    if comercial_ids is not None and incidencia.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para resolver esta incidencia")
        
    return await service.resolver(id=id, data=data, usuario_id=current_user_id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("incidencias.desactivar"))])
async def eliminar_incidencia(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Desactiva lógicamente una incidencia (Soft Delete)."""
    service = IncidenciasService(db)
    incidencia = await service.get_by_id(id)
    
    if comercial_ids is not None and incidencia.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta incidencia")
        
    await service.delete(id=id, usuario_id=current_user_id)
    return status.HTTP_204_NO_CONTENT
