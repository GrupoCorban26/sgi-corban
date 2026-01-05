from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- ESQUEMAS PARA CARGOS ---
class CargoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)
    is_active: bool = True

class CargoSave(CargoBase):
    id: Optional[int] = 0

class CargoResponse(CargoBase):
    id: int
    created_at: Optional[datetime] = None

class CargoPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[CargoResponse]

# Respuesta genérica para operaciones (success/message)
class OperationResult(BaseModel):
    success: int
    message: str
    id: Optional[int] = None