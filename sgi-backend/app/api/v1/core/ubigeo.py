from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.services.core.ubigeo import UbigeoService
from app.schemas.core.ubigeo import DepartamentoGeo, Provincia, Distrito

router = APIRouter(prefix="/ubigeo", tags=["Core - Ubigeo"])


@router.get("/departamentos", response_model=List[DepartamentoGeo])
async def listar_departamentos_geo(
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los departamentos geográficos del Perú"""
    service = UbigeoService(db)
    return await service.get_departamentos()


@router.get("/provincias", response_model=List[Provincia])
async def listar_provincias(
    departamento_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    db: AsyncSession = Depends(get_db)
):
    """Lista provincias, opcionalmente filtradas por departamento"""
    service = UbigeoService(db)
    return await service.get_provincias(departamento_id)


@router.get("/distritos", response_model=List[Distrito])
async def listar_distritos(
    provincia_id: Optional[int] = Query(None, description="Filtrar por provincia"),
    db: AsyncSession = Depends(get_db)
):
    """Lista distritos, opcionalmente filtrados por provincia"""
    service = UbigeoService(db)
    return await service.get_distritos(provincia_id)
