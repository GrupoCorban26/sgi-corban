from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import get_db
from app.services.importaciones_service import ImportacionesService
from app.schemas.importaciones import ImportacionPagination

router = APIRouter(
    prefix="/importaciones",
    tags=["Importaciones"]
)

@router.post("/upload")
async def upload_importaciones(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
        
    return await ImportacionesService.process_excel_import(db, file)

@router.get("/", response_model=ImportacionPagination)
async def list_importaciones(
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    search: str = Query(None),
    sin_telefono: bool = Query(False),
    sort_by_ruc: str = Query(None, description="Ordenar por RUC: 'asc' o 'desc'"),
    db: AsyncSession = Depends(get_db)
):
    return await ImportacionesService.get_importaciones(db, page, page_size, search, sin_telefono, sort_by_ruc)

