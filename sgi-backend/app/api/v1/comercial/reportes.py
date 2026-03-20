from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import require_permission, resolver_comercial_ids
from app.services.comercial.reportes_service import ReportesLlamadasService
from app.services.comercial.reportes_operativos_service import ReportesOperativosService
from app.schemas.comercial.reportes import (
    ReporteLlamadaPaginated,
    ReporteBaseDatos, ReporteMantenimientoCartera, ReporteGestionLeads
)

router = APIRouter(
    prefix="/comercial/reportes",
    tags=["Reportes"]
)

@router.get("/llamadas", response_model=ReporteLlamadaPaginated, dependencies=[Depends(get_current_active_auth)])
async def get_reporte_llamadas_historico(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    comercial_id: int = Query(None, description="Filtro opcional por ID de comercial"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    """
    Obtiene el historial de llamadas realizadas por los comerciales.
    Filtrado automáticamente por equipo según el rol del usuario.
    """
    service = ReportesLlamadasService(db)
    
    # Si seleccionó un comercial específico, validar que esté en su equipo
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id
    
    return await service.get_reporte_llamadas(
        fecha_inicio, fecha_fin, filtro_comercial_id, page, page_size, 
        comercial_ids=comercial_ids
    )


@router.get("/llamadas/exportar", dependencies=[Depends(get_current_active_auth)])
async def exportar_reporte_llamadas_historico(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    comercial_id: int = Query(None, description="Filtro opcional por ID de comercial"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    """
    Exporta el historial de llamadas a un archivo de Excel (.xlsx).
    Filtrado automáticamente por equipo según el rol del usuario.
    """
    service = ReportesLlamadasService(db)
    
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id
    
    return await service.exportar_reporte_llamadas(
        fecha_inicio, fecha_fin, filtro_comercial_id, comercial_ids=comercial_ids
    )


# ==========================================
# REPORTES OPERATIVOS (Fase 3)
# ==========================================

@router.get(
    "/base-datos",
    response_model=ReporteBaseDatos,
    dependencies=[Depends(get_current_active_auth)]
)
async def get_reporte_base_datos(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    comercial_id: Optional[int] = Query(None, description="Filtro opcional por ID de comercial"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    service = ReportesOperativosService(db)
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id
    
    return await service.get_reporte_base_datos(periodo, filtro_comercial_id)


@router.get(
    "/mantenimiento-cartera",
    response_model=ReporteMantenimientoCartera,
    dependencies=[Depends(get_current_active_auth)]
)
async def get_reporte_mantenimiento_cartera(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    comercial_id: Optional[int] = Query(None, description="Filtro opcional por ID de comercial"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    service = ReportesOperativosService(db)
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id
            
    return await service.get_reporte_mantenimiento_cartera(periodo, filtro_comercial_id)


@router.get(
    "/gestion-leads",
    response_model=ReporteGestionLeads,
    dependencies=[Depends(get_current_active_auth)]
)
async def get_reporte_gestion_leads(
    periodo: str = Query(..., description="Mes a consultar en formato YYYY-MM"),
    comercial_id: Optional[int] = Query(None, description="Filtro opcional por ID de comercial"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    service = ReportesOperativosService(db)
    filtro_comercial_id = None
    if comercial_id:
        if comercial_ids is None or comercial_id in comercial_ids:
            filtro_comercial_id = comercial_id
            
    return await service.get_reporte_gestion_leads(periodo, filtro_comercial_id)

@router.get("/bot-analytics", dependencies=[Depends(get_current_active_auth)])
async def get_bot_analytics(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids)
):
    """KPIs del bot: tipo de interés, leads por hora, motivos de descarte."""
    service = ReportesLlamadasService(db)
    return await service.get_bot_analytics(fecha_inicio, fecha_fin, comercial_ids)
