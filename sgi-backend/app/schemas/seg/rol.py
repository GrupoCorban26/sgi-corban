from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.schemas.seg.permiso import PermisoResponse

# =========================================
# SCHEMAS DE ROLES
# =========================================

class RolBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    is_active: bool = True

class RolCreate(RolBase):
    permisos_ids: List[int] = []

class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    is_active: Optional[bool] = None
    permisos_ids: Optional[List[int]] = None

class RolResponse(RolBase):
    id: int
    permisos: List[PermisoResponse] = []

    model_config = ConfigDict(from_attributes=True)
