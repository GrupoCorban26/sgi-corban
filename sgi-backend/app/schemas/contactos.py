from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ContactoBase(BaseModel):
    ruc: str = Field(..., max_length=11)
    cargo: Optional[str] = Field(None, max_length=100)
    telefono: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    origen: Optional[str] = Field(None, max_length=30)
    is_client: bool = Field(False)

class ContactoCreate(ContactoBase):
    pass

class ContactoUpdate(BaseModel):
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    origen: Optional[str] = None
    is_client: Optional[bool] = None

class ContactoResponse(ContactoBase):
    id: int
    is_active: bool
    # Campos de asignación
    asignado_a: Optional[int] = None
    fecha_asignacion: Optional[datetime] = None
    lote_asignacion: Optional[int] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
