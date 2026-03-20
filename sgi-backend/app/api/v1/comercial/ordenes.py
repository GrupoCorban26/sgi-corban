from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import require_permission
from app.services.comercial.ordenes_service import OrdenesService

router = APIRouter(
    prefix="/comercial/ordenes",
    tags=["Órdenes"],
)


@router.post(
    "/importar-sispac",
    dependencies=[Depends(require_permission("ordenes.importar"))],
)
async def importar_sispac(
    file: UploadFile = File(..., description="Excel SISPAC (.xlsx)"),
    empresa: str = Form(..., description="CORBAN o EBL"),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(get_current_active_auth),
):
    """Importa órdenes desde un reporte Excel de SISPAC."""
    if empresa.upper() not in ("CORBAN", "EBL"):
        return {"detail": "Empresa debe ser CORBAN o EBL"}

    content = await file.read()
    service = OrdenesService(db)
    result = await service.importar_sispac(content, empresa.upper(), int(auth["sub"]))
    return result


@router.post(
    "/importar-sintad",
    dependencies=[Depends(require_permission("ordenes.importar"))],
)
async def importar_sintad(
    file: UploadFile = File(..., description="Excel SINTAD (.xls)"),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(get_current_active_auth),
):
    """Importa órdenes desde un reporte Excel de SINTAD (Corban Aduanas)."""
    content = await file.read()
    service = OrdenesService(db)
    result = await service.importar_sintad(content, int(auth["sub"]))
    return result


@router.get(
    "/listado",
    dependencies=[Depends(require_permission("ordenes.ver"))],
)
async def get_ordenes(
    periodo: Optional[str] = Query(None, description="Periodo YYYY-MM"),
    empresa: Optional[str] = Query(None, description="CORBAN o EBL"),
    comercial_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(get_current_active_auth),
):
    """Listado paginado de órdenes importadas."""
    service = OrdenesService(db)
    return await service.get_ordenes(periodo, empresa, comercial_id, page, page_size)


@router.get(
    "/resumen",
    dependencies=[Depends(require_permission("ordenes.ver"))],
)
async def get_resumen(
    periodo: str = Query(..., description="Periodo YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    auth: dict = Depends(get_current_active_auth),
):
    """Resumen de órdenes por comercial para un periodo (meta de 20 órdenes/mes)."""
    service = OrdenesService(db)
    return await service.get_resumen(periodo)
