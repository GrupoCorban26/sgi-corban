"""
Router de Analytics del Buzón.
Endpoint unificado que retorna datos de WhatsApp + Web en 3 niveles.
"""
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from app.database.db_connection import get_db
from app.services.comercial.analytics_buzon_service import AnalyticsBuzonService
from app.schemas.comercial.analytics import AnalyticsBuzonResponse
from app.core.dependencies import get_current_user_obj, resolver_comercial_ids
from app.models.seguridad import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comercial/analytics", tags=["analytics-buzon"])


@router.get("/buzon", response_model=AnalyticsBuzonResponse)
async def obtener_analytics_buzon(
    fecha_desde: Optional[datetime] = Query(None, description="Inicio del rango (ISO 8601)"),
    fecha_hasta: Optional[datetime] = Query(None, description="Fin del rango (ISO 8601)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Retorna estadísticas unificadas del buzón (WhatsApp + Web) en 3 niveles:
    1. General (fusionado)
    2. Por Canal (tabs WhatsApp / Web)
    3. Comparativo (lado a lado)

    Filtros opcionales: rango de fechas. Sin rango = últimos 6 meses.
    RBAC: ADMIN/GERENCIA/SISTEMAS ven todo. JEFE_COMERCIAL ve su equipo.
    COMERCIAL ve solo lo propio.
    """
    service = AnalyticsBuzonService(db)
    return await service.obtener_estadisticas(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        comercial_ids=comercial_ids,
    )
