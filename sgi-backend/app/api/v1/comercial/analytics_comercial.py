"""
Router de Analytics Comercial (Fase 4 - Storytelling).
Endpoints para el Radar de Productividad y el Embudo de Ventas.
"""
import logging
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date
from app.database.db_connection import get_db
from app.services.comercial.analytics_comercial_service import AnalyticsComercialService
from app.schemas.comercial.analytics_comercial import (
    RadarResponse, 
    EmbudoResponse,
    CotizacionesAnalyticsResponse
)
from app.core.dependencies import get_current_user_obj, resolver_comercial_ids
from app.models.seguridad import Usuario
from app.models.core import Empresa
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comercial/analytics", tags=["analytics-comercial"])


@router.get("/radar", response_model=RadarResponse)
async def obtener_radar_comercial(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por empresa"),
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
    return await service.get_radar_data(periodo, comercial_ids, cliente_id=cliente_id)


@router.get("/embudo", response_model=EmbudoResponse)
async def obtener_embudo_comercial(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por empresa"),
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
    return await service.get_embudo_data(periodo, comercial_ids, cliente_id=cliente_id)


@router.get("/cotizaciones/resumen", response_model=CotizacionesAnalyticsResponse)
async def obtener_cotizaciones_analytics(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente externo"),
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa del grupo"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Retorna las métricas y distribuciones de rendimiento comercial del Kanban de cotizaciones
    para el rango de fechas especificado.
    """
    service = AnalyticsComercialService(db)
    return await service.get_cotizaciones_analytics(
        fecha_inicio, fecha_fin, comercial_ids, cliente_id=cliente_id, empresa_id=empresa_id
    )


@router.get("/cotizaciones/exportar")
async def exportar_cotizaciones_excel(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente externo"),
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa del grupo"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """
    Genera y descarga el reporte en formato Excel (.xlsx) con los datos del Kanban
    de cotizaciones comerciales para el rango de fechas especificado.
    """
    service = AnalyticsComercialService(db)
    excel_content = await service.export_cotizaciones_excel(
        fecha_inicio, fecha_fin, comercial_ids, cliente_id=cliente_id, empresa_id=empresa_id
    )
    
    filename = f"reporte_cotizaciones_{fecha_inicio}_a_{fecha_fin}.xlsx"
    return StreamingResponse(
        io.BytesIO(excel_content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/empresas", response_model=List[dict])
async def obtener_empresas_grupo(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """
    Retorna la lista de empresas del grupo desde core.empresas.
    """
    result = await db.execute(select(Empresa).order_by(Empresa.razon_social))
    empresas = result.scalars().all()
    return [{"id": e.id, "razon_social": e.razon_social, "ruc": e.ruc} for e in empresas]
