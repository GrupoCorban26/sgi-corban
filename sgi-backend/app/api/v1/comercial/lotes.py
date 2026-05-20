from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_permission
from app.services.comercial.lotes_base_service import LotesBaseService

router = APIRouter(
    prefix="/lotes",
    tags=["Lotes de Prospección"]
)

@router.get("", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def get_lotes(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todos los lotes con estadísticas de total y disponibles."""
    service = LotesBaseService(db)
    return await service.get_lotes()

@router.patch("/{lote_id}/estado", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def toggle_lote_estado(
    lote_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Activa o desactiva un lote (DISPONIBLE / FINALIZADO)."""
    service = LotesBaseService(db)
    return await service.toggle_lote_estado(lote_id)

@router.post("/upload", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def upload_lote(
    empresa: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Sube un Excel de contactos y puebla la base comercial."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xls, .xlsx)")

    service = LotesBaseService(db)
    return await service.upload_lote(file, empresa, user_id)

@router.get("/{lote_id}/download", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def download_lote_cross_data(
    lote_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Genera y descarga un Excel con la información cruzada de llamadas para el lote dado."""
    service = LotesBaseService(db)
    excel_data, filename = await service.export_lote_cross_data(lote_id)

    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
