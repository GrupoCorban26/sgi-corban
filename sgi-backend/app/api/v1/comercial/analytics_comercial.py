"""
Router de Analytics Comercial (Fase 4 - Storytelling).
Endpoints para el Radar de Productividad y el Embudo de Ventas.
"""
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database.db_connection import get_db
from app.services.comercial.analytics_comercial_service import AnalyticsComercialService
from app.schemas.comercial.analytics_comercial import RadarResponse, EmbudoResponse
from app.core.dependencies import get_current_user_obj, resolver_comercial_ids
from app.models.seguridad import Usuario
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comercial/analytics", tags=["analytics-comercial"])


@router.get("/radar", response_model=RadarResponse)
async def obtener_radar_comercial(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Retorna los datos para el Tablero de Radar Comercial:
    - Progreso de órdenes vs Meta mensual
    - KPIs (Total gestiones, nuevos clientes)
    - Pipeline actual por comercial
    - Alertas de clientes muertos (sin contacto > 15 días)
    """
    service = AnalyticsComercialService(db)
    return await service.get_radar_data(periodo, comercial_ids)


@router.get("/embudo", response_model=EmbudoResponse)
async def obtener_embudo_comercial(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Retorna los datos para el Tablero de Embudo y Diagnóstico:
    - Funnel de conversión (Prospectos -> Operación)
    - Tiempos promedio por etapa
    - Top 5 motivos de caída
    - Efectividad por origen (mock/reservado)
    """
    service = AnalyticsComercialService(db)
    return await service.get_embudo_data(periodo, comercial_ids)
