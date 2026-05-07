from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_permission
from app.services.comercial.lotes_service import LotesService
from app.schemas.comercial.lotes import LoteCreate

router = APIRouter(
    prefix="/contactos/lotes",
    tags=["Lotes de Contactos"]
)


@router.get("", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def get_lotes(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todos los lotes con estadísticas de total y disponibles."""
    service = LotesService(db)
    return await service.get_lotes()


@router.post("", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def create_lote(
    body: LoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Crea un nuevo lote vacío."""
    service = LotesService(db)
    return await service.create_lote(body.nombre, user_id)


@router.put("/{lote_id}/toggle", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def toggle_lote(
    lote_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Activa o desactiva un lote."""
    service = LotesService(db)
    return await service.toggle_lote(lote_id)


@router.post("/{lote_id}/upload", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def upload_contactos_a_lote(
    lote_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Sube un Excel de contactos y los asocia al lote indicado."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xls, .xlsx)")

    service = LotesService(db)
    return await service.upload_contactos_a_lote(lote_id, file)
