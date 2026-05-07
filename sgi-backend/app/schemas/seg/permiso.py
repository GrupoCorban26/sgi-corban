from pydantic import BaseModel, ConfigDict
from typing import Optional

# =========================================
# SCHEMAS DE PERMISOS
# =========================================

class PermisoBase(BaseModel):
    nombre_tecnico: str
    nombre_display: str
    modulo: Optional[str] = None
    descripcion: Optional[str] = None
    is_active: bool = True

class PermisoResponse(PermisoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
