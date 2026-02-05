from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ============================================================
# SCHEMAS PARA CITAS INDIVIDUALES (Comercial)
# ============================================================

class CitaBase(BaseModel):
    """Base para citas individuales con cliente"""
    cliente_id: int
    fecha: datetime
    hora: str
    tipo_cita: str  # VISITA_CLIENTE, VISITA_OFICINA
    direccion: Optional[str] = None
    motivo: str
    con_presente: bool = False  # Llevar regalo


class CitaCreate(CitaBase):
    """Crear cita individual (comercial)"""
    pass


class CitaUpdate(BaseModel):
    """Actualizar cita (por el comercial antes de aprobación)"""
    fecha: Optional[datetime] = None
    hora: Optional[str] = None
    tipo_cita: Optional[str] = None
    direccion: Optional[str] = None
    motivo: Optional[str] = None
    con_presente: Optional[bool] = None


# ============================================================
# SCHEMAS PARA SALIDAS A CAMPO (Jefe Comercial)
# ============================================================

class SalidaCampoCreate(BaseModel):
    """Crear una salida a campo (jefe comercial)"""
    fecha: datetime
    hora: str
    direccion: Optional[str] = None
    objetivo_campo: str  # Objetivo de la salida
    comerciales_ids: List[int]  # Lista de IDs de usuarios/comerciales
    con_presente: bool = False


class SalidaCampoUpdate(BaseModel):
    """Actualizar salida a campo"""
    fecha: Optional[datetime] = None
    hora: Optional[str] = None
    direccion: Optional[str] = None
    objetivo_campo: Optional[str] = None
    comerciales_ids: Optional[List[int]] = None
    con_presente: Optional[bool] = None


# ============================================================
# SCHEMAS PARA APROBACIÓN/RECHAZO
# ============================================================

class CitaAprobar(BaseModel):
    """Aprobar una cita individual"""
    acompanado_por_id: Optional[int] = None  # NULL = va solo
    ira_solo: bool = False  # Checkbox "Irá solo"
    conductor_id: Optional[int] = None  # Opcional


class CitaRechazar(BaseModel):
    """Rechazar una cita"""
    motivo_rechazo: str


# ============================================================
# SCHEMAS DE RESPUESTA
# ============================================================

class ComercialAsignado(BaseModel):
    """Comercial asignado a una salida a campo"""
    id: int
    usuario_id: int
    nombre: Optional[str] = None
    confirmado: bool = False

    class Config:
        from_attributes = True


class CitaResponse(BaseModel):
    """Respuesta de cita (individual o salida a campo)"""
    id: int
    tipo_agenda: str  # INDIVIDUAL | SALIDA_CAMPO
    
    # Cliente (nullable para salidas a campo)
    cliente_id: Optional[int] = None
    cliente_razon_social: Optional[str] = None
    
    # Comercial que solicita
    comercial_id: int
    comercial_nombre: Optional[str] = None
    
    # Datos de la cita
    fecha: datetime
    hora: str
    tipo_cita: Optional[str] = None
    direccion: Optional[str] = None
    motivo: Optional[str] = None
    objetivo_campo: Optional[str] = None  # Solo para salidas a campo
    con_presente: bool = False
    
    # Estado y workflow
    estado: str
    motivo_rechazo: Optional[str] = None
    
    # Asignaciones
    acompanado_por_id: Optional[int] = None
    acompanante_nombre: Optional[str] = None
    conductor_id: Optional[int] = None
    conductor_info: Optional[str] = None
    
    # Para salidas a campo: lista de comerciales asignados
    comerciales_asignados: Optional[List[ComercialAsignado]] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True
