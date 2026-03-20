from pydantic import BaseModel, ConfigDict, Field, field_validator
import re
from typing import Optional
from datetime import datetime

class ContactoBase(BaseModel):
    ruc: str = Field(..., max_length=11)
    nombre: Optional[str] = Field(None, max_length=150)
    cargo: Optional[str] = Field(None, max_length=100)
    telefono: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    origen: Optional[str] = Field(None, max_length=30)
    is_client: bool = Field(False)
    is_principal: bool = Field(False)

    @field_validator('telefono', mode='before')
    @classmethod
    def clean_telefono(cls, v: str | None) -> str | None:
        if v:
            return re.sub(r'[^\d+]', '', str(v))
        return v

class ContactoCreate(ContactoBase):
    pass

class ContactoManualCreate(BaseModel):
    ruc: str = Field(..., max_length=11)
    nombre: Optional[str] = Field(None, max_length=150)
    cargo: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    crear_como_prospecto: bool = Field(False, description="Si True, crea Cliente y va directo a cartera")

    @field_validator('telefono', mode='before')
    @classmethod
    def clean_telefono(cls, v: str | None) -> str | None:
        if v:
            return re.sub(r'[^\d+]', '', str(v))
        return v

class AsignarLeadManual(BaseModel):
    comercial_id: int = Field(..., description="ID del comercial responsable")

class ContactoUpdate(BaseModel):
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    origen: Optional[str] = None
    is_client: Optional[bool] = None

    @field_validator('telefono', mode='before')
    @classmethod
    def clean_telefono(cls, v: str | None) -> str | None:
        if v:
            return re.sub(r'[^\d+]', '', str(v))
        return v

class ContactoResponse(ContactoBase):
    id: int
    is_active: bool
    # Campos de asignación
    asignado_a: Optional[int] = None
    fecha_asignacion: Optional[datetime] = None
    lote_asignacion: Optional[int] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
