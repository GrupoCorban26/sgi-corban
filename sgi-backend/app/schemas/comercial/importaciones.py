from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal

class ImportacionBase(BaseModel):
    id: int
    ruc: Optional[str] = None
    razon_social: Optional[str] = None
    sector: Optional[str] = None
    score: Optional[Decimal] = None
    agentes_distintos: Optional[int] = None
    total_embarques: Optional[int] = None
    meses_activos: Optional[int] = None
    fob_promedio: Optional[Decimal] = None
    via_predominante: Optional[str] = None
    paises_principales: Optional[str] = None
    ultima_importacion: Optional[str] = None
    dias_desde_ultima: Optional[int] = None

class ImportacionResponse(ImportacionBase):
    model_config = ConfigDict(from_attributes=True)

class ImportacionPagination(BaseModel):
    total: int
    page: int
    page_size: int
    data: list[ImportacionResponse]