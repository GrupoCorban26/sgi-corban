from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_token_payload, get_current_active_auth
from app.services.comercial.gestion_service import GestionService
from app.schemas.comercial.gestion import GestionCreate, GestionResponse

router = APIRouter(prefix="/clientes", tags=["Gestiones"])


@router.post("/{cliente_id}/gestiones")
async def registrar_gestion(
    cliente_id: int,
    data: GestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Registra una nueva gestión (llamada, email, visita, etc.) para un cliente."""
    service = GestionService(db)
    result = await service.registrar_gestion(cliente_id, data, current_user_id)
    if result["success"] == 0:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/{cliente_id}/gestiones")
async def obtener_gestiones(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """Obtiene el historial completo de gestiones de un cliente."""
    service = GestionService(db)
    return await service.get_gestiones(cliente_id)


@router.get("/{comercial_id}/productividad")
async def obtener_productividad(
    comercial_id: int,
    fecha_inicio: date = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: date = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """Obtiene métricas de productividad de un comercial en un rango de fechas."""
    service = GestionService(db)
    return await service.get_productividad(comercial_id, fecha_inicio, fecha_fin)
