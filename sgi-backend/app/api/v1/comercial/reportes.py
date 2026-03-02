from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import require_permission
from app.services.comercial.reportes_service import ReportesLlamadasService
from app.schemas.comercial.reportes import ReporteLlamadaPaginated

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes Comercial"]
)

@router.get("/llamadas", response_model=ReporteLlamadaPaginated, dependencies=[Depends(require_permission("reportes.ver_comercial"))])
async def get_reporte_llamadas_historico(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    comercial_id: int = Query(None, description="Filtro opcional por ID de comercial"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Obtiene el historial de llamadas realizadas por los comerciales.
    Utiliza la tabla historial_llamadas para no perder registros al reasignar bases.
    """
    service = ReportesLlamadasService(db)
    return await service.get_reporte_llamadas(fecha_inicio, fecha_fin, comercial_id, page, page_size)


@router.get("/llamadas/exportar", dependencies=[Depends(require_permission("reportes.ver_comercial"))])
async def exportar_reporte_llamadas_historico(
    fecha_inicio: date = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: date = Query(..., description="Fecha fin YYYY-MM-DD"),
    comercial_id: int = Query(None, description="Filtro opcional por ID de comercial"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """
    Exporta el historial de llamadas a un archivo de Excel (.xlsx).
    """
    service = ReportesLlamadasService(db)
    return await service.exportar_reporte_llamadas(fecha_inicio, fecha_fin, comercial_id)
