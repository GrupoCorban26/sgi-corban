from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.services.comercial.casos_llamada_service import CasosLlamadaService
from app.schemas.comercial.casos_llamada import CasoLlamadaResponse, CasoLlamadaCreate, CasoLlamadaUpdate

router = APIRouter(
    prefix="/casos-llamada",
    tags=["Casos Llamada"]
)

@router.get("/", response_model=List[CasoLlamadaResponse])
async def get_all_casos(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista todos los casos de llamada."""
    return await CasosLlamadaService.get_all(db)

@router.get("/{id}", response_model=CasoLlamadaResponse)
async def get_caso(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene un caso de llamada por ID."""
    return await CasosLlamadaService.get_by_id(db, id)

@router.post("/", response_model=dict)
async def create_caso(
    caso: CasoLlamadaCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Crea un nuevo caso de llamada."""
    return await CasosLlamadaService.create(db, caso.dict())

@router.put("/{id}", response_model=bool)
async def update_caso(
    id: int,
    caso: CasoLlamadaUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Actualiza un caso de llamada existente."""
    return await CasosLlamadaService.update(db, id, caso.dict(exclude_unset=True))

@router.delete("/{id}", response_model=bool)
async def delete_caso(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Elimina un caso de llamada (solo si no está en uso)."""
    return await CasosLlamadaService.delete(db, id)
