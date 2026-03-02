from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ReporteLlamadaResponse(BaseModel):
    id: int
    ruc: str
    razon_social: str
    telefono: str
    contesto: bool
    caso_nombre: str
    comentario: Optional[str] = None
    comercial_nombre: str
    fecha_llamada: datetime

    model_config = ConfigDict(from_attributes=True)

class ReporteLlamadaPaginated(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[ReporteLlamadaResponse]
