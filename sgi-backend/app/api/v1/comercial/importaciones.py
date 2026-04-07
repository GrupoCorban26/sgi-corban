from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.comercial.importaciones_service import ImportacionesService
from app.schemas.comercial.importaciones import ImportacionPagination

router = APIRouter(
    prefix="/importaciones",
    tags=["Importaciones"]
)

@router.post("/upload")
async def upload_importaciones(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Sube un Excel de importaciones (reemplaza datos anteriores)."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xls o .xlsx)")

    service = ImportacionesService(db)
    return await service.process_excel_import(file)

@router.get("/", response_model=ImportacionPagination)
async def list_importaciones(
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    search: str = Query(None),
    sin_telefono: bool = Query(False),
    sort_by_ruc: str = Query(None, description="Ordenar por RUC: 'asc' o 'desc'"),
    pais_origen: str = Query(None, description="Filtrar por país de origen exacto"),
    cant_agentes: int = Query(None, description="Filtrar por cantidad de agentes de aduana"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista importaciones con paginación y filtros."""
    service = ImportacionesService(db)
    return await service.get_importaciones(page, page_size, search, sin_telefono, sort_by_ruc, pais_origen, cant_agentes)

@router.get("/paises/dropdown")
async def get_paises(db: AsyncSession = Depends(get_db)):
    """Devuelve listado de países únicos disponibles en importaciones (para filtros).
    Endpoint público - usado por scripts externos de Python."""
    service = ImportacionesService(db)
    return await service.get_paises_dropdown()
