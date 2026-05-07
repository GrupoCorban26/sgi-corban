from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# =========================================
# SCHEMAS DE SESIONES
# =========================================

class SesionResponse(BaseModel):
    id: int
    usuario_id: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    expira_en: datetime
    es_revocado: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
