from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.areas import AreaPaginationResponse, AreaSave, AreaResponse, OperationResult
from app.services import area as area_service
from app.database.db_connection import get_db

router = APIRouter()

# 1. LISTAR (Read All / Search)
@router.get("/", response_model=AreaPaginationResponse)
async def get_areas(
    page: int = 1, 
    page_size: int = 20, 
    busqueda: str = None, 
    db: AsyncSession = Depends(get_db)
):
    resultado = await area_service.listar_areas(db, page, page_size, busqueda)
    if not resultado:
        raise HTTPException(status_code=404, detail="No se encontraron áreas")
    return resultado

# 2. OBTENER UNO (Read Single) -> ¡NUEVO!
# Necesario para cuando el usuario hace clic en "Editar" y quieres cargar sus datos
@router.get("/{id}", response_model=AreaResponse)
async def get_area(id: int, db: AsyncSession = Depends(get_db)):
    resultado = await area_service.obtener_area_por_id(db, id)
    if not resultado:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    return resultado

# 3. GUARDAR (Create / Update - Upsert)
@router.post("/", response_model=OperationResult)
async def post_area(payload: AreaSave, db: AsyncSession = Depends(get_db)):
    return await area_service.guardar_area(db, payload)

# 4. CAMBIAR ESTADO (Delete / Inactivate) -> ¡NUEVO!
# Usa tu SP adm.sp_estado_area
@router.patch("/{id}/estado", response_model=OperationResult)
async def toggle_area_status(id: int, is_active: bool, db: AsyncSession = Depends(get_db)):
    resultado = await area_service.cambiar_estado_area(db, id, is_active)
    if not resultado:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el estado")
    return resultado