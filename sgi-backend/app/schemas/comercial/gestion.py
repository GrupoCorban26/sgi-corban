from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import Enum


class TipoGestion(str, Enum):
    LLAMADA = "LLAMADA"
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    VISITA = "VISITA"
    OTRO = "OTRO"


class ResultadoGestion(str, Enum):
    CONTESTO = "CONTESTO"
    NO_CONTESTO = "NO_CONTESTO"
    INTERESADO = "INTERESADO"
    COTIZACION_ENVIADA = "COTIZACION_ENVIADA"
    NO_LE_INTERESA = "NO_LE_INTERESA"
    LLAMAR_DESPUES = "LLAMAR_DESPUES"


class GestionCreate(BaseModel):
    tipo: TipoGestion
    resultado: ResultadoGestion
    comentario: Optional[str] = None
    proxima_fecha_contacto: Optional[date] = None


class GestionResponse(BaseModel):
    id: int
    cliente_id: int
    comercial_id: int
    comercial_nombre: Optional[str] = None
    tipo: str
    resultado: str
    comentario: Optional[str] = None
    proxima_fecha_contacto: Optional[date] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
