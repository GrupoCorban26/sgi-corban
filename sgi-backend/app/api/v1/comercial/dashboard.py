"""
Endpoint del Dashboard consolidado de Reportes.
"""
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import resolver_comercial_ids
from app.services.comercial.dashboard_service import DashboardService
from app.services.comercial.stats_resumen_service import StatsResumenService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/comercial/reportes",
    tags=["Dashboard Reportes"]
)


@router.get("/dashboard", dependencies=[Depends(get_current_active_auth)])
async def get_dashboard(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    comparar: bool = Query(False, description="Comparar con el período anterior"),
    comercial_id: Optional[int] = Query(None, description="Filtro por comercial"),
    empresa: Optional[str] = Query(None, description="Filtro por empresa"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Dashboard consolidado con KPIs de llamadas, buzón y cartera.
    Soporta comparación con el período anterior (misma duración).
    """
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id

    service = DashboardService(db)
    return await service.get_dashboard_data(
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        comparar=comparar,
        comercial_id=filtro_comercial_id,
        empresa=empresa,
        comercial_ids=comercial_ids,
    )


@router.get("/stats/resumen", dependencies=[Depends(get_current_active_auth)])
async def get_stats_resumen(
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Resumen ligero del día de hoy para las tarjetas del dashboard operativo.
    Retorna: llamadas_base, gestiones_cartera, leads_asignados.
    RBAC automático via resolver_comercial_ids.
    """
    service = StatsResumenService(db)
    return await service.get_resumen_hoy(comercial_ids=comercial_ids)
