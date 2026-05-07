from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# Schemas para Configuraciones del Sistema
# ============================================

class ConfiguracionBase(BaseModel):
    """Campos comunes de configuración"""
    clave: str = Field(..., max_length=100, description="Clave única de la configuración")
    valor: Optional[str] = Field(None, max_length=2000, description="Valor de la configuración")
    tipo_dato: str = Field("STRING", description="STRING, INTEGER, BOOLEAN, JSON, IMAGE, SECRET")
    categoria: Optional[str] = Field(None, max_length=100, description="APARIENCIA, EMPRESAS, INTEGRACIONES, OPERATIVO")
    descripcion: Optional[str] = Field(None, max_length=300)
    is_sensible: bool = Field(False, description="Si es True, el valor se almacena encriptado")


class ConfiguracionCreate(ConfiguracionBase):
    """Crear una nueva configuración"""
    pass


class ConfiguracionUpdate(BaseModel):
    """Actualizar una configuración existente"""
    valor: Optional[str] = Field(None, max_length=2000)
    descripcion: Optional[str] = Field(None, max_length=300)
    motivo_cambio: Optional[str] = Field(None, max_length=200, description="Motivo del cambio (para auditoría)")


class ConfiguracionResponse(BaseModel):
    """Respuesta de configuración (valor sensible enmascarado)"""
    id: int
    clave: str
    valor: Optional[str] = None
    tipo_dato: str
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    is_sensible: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConfiguracionPublicResponse(BaseModel):
    """Respuesta pública (solo configuraciones no sensibles, sin metadatos)"""
    clave: str
    valor: Optional[str] = None
    tipo_dato: str
    categoria: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HistorialResponse(BaseModel):
    """Respuesta del historial de cambios"""
    id: int
    configuracion_id: int
    clave: Optional[str] = None
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    motivo_cambio: Optional[str] = None
    modificado_por: Optional[int] = None
    modificado_por_nombre: Optional[str] = None
    fecha_cambio: datetime

    model_config = ConfigDict(from_attributes=True)
