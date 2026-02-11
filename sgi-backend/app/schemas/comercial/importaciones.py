from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from decimal import Decimal

class ImportacionBase(BaseModel):
    id: Optional[int] = None
    ruc: Optional[str] = None
    anio: Optional[str] = None
    razon_social: Optional[str] = None
    aduanas: Optional[str] = None
    via_transporte: Optional[str] = None
    paises_origen: Optional[str] = None
    puertos_embarque: Optional[str] = None
    embarcadores: Optional[str] = None
    agente_aduanas: Optional[str] = None
    partida_arancelaria_cod: Optional[str] = None
    partida_arancelaria_descripcion: Optional[str] = None
    fob_min: Optional[Decimal] = None
    fob_max: Optional[Decimal] = None
    fob_prom: Optional[Decimal] = None
    fob_anual: Optional[Decimal] = None
    total_operaciones: Optional[int] = None
    cantidad_agentes: Optional[int] = None
    cantidad_paises: Optional[int] = None
    cantidad_partidas: Optional[int] = None
    primera_importacion: Optional[date] = None
    ultima_importacion: Optional[date] = None

class ImportacionResponse(ImportacionBase):
    model_config = ConfigDict(from_attributes=True)

class ImportacionPagination(BaseModel):
    total: int
    page: int
    page_size: int
    data: list[ImportacionResponse]