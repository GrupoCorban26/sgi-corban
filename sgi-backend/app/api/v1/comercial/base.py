from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.comercial.base_comercial_service import BaseComercialService

router = APIRouter(
    prefix="/base",
    tags=["Base Comercial"]
)

@router.get("/")
async def get_base_comercial(
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Retorna el merge entre registro_importaciones y cliente_contactos con stats."""
    service = BaseComercialService(db)
    return await service.get_base_con_stats(page, page_size, search)

@router.get("/stats")
async def get_base_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Estadísticas de la base comercial."""
    service = BaseComercialService(db)
    return await service.get_stats()