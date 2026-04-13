from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal

class ImportacionBase(BaseModel):
    id: int
    ruc: Optional[str] = None
    razon_social: Optional[str] = None
    fob_anual_usd: Optional[Decimal] = None
    flete_anual_usd: Optional[Decimal] = None
    flete_x_kg_usd: Optional[Decimal] = None
    peso_anual_kg: Optional[Decimal] = None
    embarques_anuales: Optional[Decimal] = None
    agentes_distintos: Optional[int] = None
    meses_distintos: Optional[int] = None
    categoria_frecuencia: Optional[str] = None
    prox_embarque_estimado: Optional[str] = None
    paises_origen: Optional[str] = None
    aduanas: Optional[str] = None
    partidas_arancelarias: Optional[str] = None

class ImportacionResponse(ImportacionBase):
    model_config = ConfigDict(from_attributes=True)

class ImportacionPagination(BaseModel):
    total: int
    page: int
    page_size: int
    data: list[ImportacionResponse]