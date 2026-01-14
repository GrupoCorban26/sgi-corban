from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CasoLlamadaBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    contestado: bool = Field(False)

class CasoLlamadaCreate(CasoLlamadaBase):
    pass

class CasoLlamadaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    contestado: Optional[bool] = None

class CasoLlamadaResponse(CasoLlamadaBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
