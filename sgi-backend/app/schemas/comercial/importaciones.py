from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal

class ImportacionBase(BaseModel):
    id: Optional[int] = None
    ruc: Optional[str] = None
    razon_social: Optional[str] = None
    fob_datasur_mundo: Optional[Decimal] = None
    fob_sunat_china: Optional[Decimal] = None
    fob_total_real: Optional[Decimal] = None
    transacciones_datasur: Optional[int] = None
    paises_origen: Optional[str] = None
    partidas_arancelarias: Optional[str] = None
    importa_de_china: Optional[str] = None

class ImportacionResponse(ImportacionBase):
    model_config = ConfigDict(from_attributes=True)

class ImportacionPagination(BaseModel):
    total: int
    page: int
    page_size: int
    data: list[ImportacionResponse]