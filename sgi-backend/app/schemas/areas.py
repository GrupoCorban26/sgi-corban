from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- ESQUEMAS PARA ÁREAS ---
class AreaSchema(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)
    parent_area_id: Optional[int] = None
    responsable_id: Optional[int] = None
    comisiona_ventas: bool = False
    is_active: bool = True

class AreaSave(AreaSchema):
    id: Optional[int] = 0  # 0 o None para crear, >0 para actualizar

class AreaResponse(AreaSchema):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AreaPaginationResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[AreaResponse]

class OperationResult(BaseModel):
    success: int               # 1 para Éxito, 0 para Error
    message: str               # Mensaje descriptivo del SP
    id: Optional[int] = None   # El ID del registro afectado (opcional)