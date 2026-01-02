from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.areas import AreaPaginationResponse, AreaCreate, AreaUpdate, AreaResponse, OperationResult
from app.services import area as area_service
from app.database.db_connection import get_db
from app.core.security import get_current_user_id

router = APIRouter(prefix="/area", tags=["Áreas"])

# 1. LISTAR (Protegido con token)
@router.get("/", response_model=AreaPaginationResponse)
async def get_areas(
    page: int = 1, 
    page_size: int = 20, 
    busqueda: str = None, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(get_current_user_id) # Validamos que esté logueado
):
    resultado = await area_service.listar_areas(db, page, page_size, busqueda)
    if not resultado:
        raise HTTPException(status_code=404, detail="No se encontraron áreas")
    return resultado

# 2. OBTENER UNO
@router.get("/{id}", response_model=AreaResponse)
async def get_area(
    id: int, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(get_current_user_id)
):
    resultado = await area_service.obtener_area_por_id(db, id)
    if not resultado:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    return resultado

# 3. CREAR (POST)
@router.post("/", response_model=OperationResult)
async def crear_area(
    payload: AreaCreate, 
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id) # Obtenemos ID para auditoría
):
    # Llamamos a la función específica de creación
    return await area_service.crear_area(db, payload, usuario_id)

# 4. ACTUALIZAR (PUT)
@router.put("/{area_id}", response_model=OperationResult)
async def actualizar_area(
    area_id: int,
    payload: AreaUpdate, 
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id)
):
    # Forzamos que el ID de la URL sea el que se use
    payload.area_id = area_id
    # Llamamos a la función específica de actualización
    return await area_service.actualizar_area(db, payload, usuario_id)

# 5. CAMBIAR ESTADO (PATCH)
@router.patch("/{id}/estado", response_model=OperationResult)
async def toggle_area_status(
    id: int, 
    is_active: bool, 
    db: AsyncSession = Depends(get_db),
    usuario_id: int = Depends(get_current_user_id) # Añadido para auditoría
):
    resultado = await area_service.cambiar_estado_area(db, id, is_active, usuario_id)
    if not resultado:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el estado")
    return resultado