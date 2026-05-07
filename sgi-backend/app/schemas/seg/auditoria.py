from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# =========================================
# SCHEMAS DE AUDITORÍA
# =========================================

class AuditoriaSeguridadResponse(BaseModel):
    id: int
    usuario_afectado_id: Optional[int] = None
    usuario_afectado_nombre: Optional[str] = None
    accion: str
    detalle: Optional[str] = None
    realizado_por: int
    realizado_por_nombre: Optional[str] = None
    ip_address: Optional[str] = None
    fecha_evento: datetime

    model_config = ConfigDict(from_attributes=True)
