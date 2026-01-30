from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class CitaBase(BaseModel):
    cliente_id: int
    fecha: datetime # Puede venir como datetime
    hora: str
    tipo_cita: str
    direccion: Optional[str] = None
    motivo: str
    con_presente: bool = False

class CitaCreate(CitaBase):
    pass

class CitaUpdate(BaseModel):
    fecha: Optional[datetime] = None
    hora: Optional[str] = None
    tipo_cita: Optional[str] = None
    direccion: Optional[str] = None
    motivo: Optional[str] = None
    con_presente: Optional[bool] = None

class CitaAprobar(BaseModel):
    acompanado_por_id: Optional[int] = None
    conductor_id: Optional[int] = None # ID de la tabla logistica.conductores

class CitaRechazar(BaseModel):
    motivo_rechazo: str

class CitaResponse(CitaBase):
    id: int
    comercial_id: int
    estado: str
    motivo_rechazo: Optional[str] = None
    acompanado_por_id: Optional[int] = None
    conductor_id: Optional[int] = None
    
    # Nombres expandidos
    cliente_razon_social: Optional[str] = None
    comercial_nombre: Optional[str] = None
    acompanante_nombre: Optional[str] = None
    conductor_info: Optional[str] = None # "Juan - Van (ABC)"

    created_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True
