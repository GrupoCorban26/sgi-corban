from pydantic import BaseModel, ConfigDict

# ============================================
# Schemas para Ubigeo (Geográfico)
# ============================================

class DepartamentoGeo(BaseModel):
    """Departamento geográfico del Perú"""
    id: int
    nombre: str
    ubigeo: str
    
    model_config = ConfigDict(from_attributes=True)


class Provincia(BaseModel):
    """Provincia del Perú"""
    id: int
    nombre: str
    departamento_id: int
    ubigeo: str
    
    model_config = ConfigDict(from_attributes=True)


class Distrito(BaseModel):
    """Distrito del Perú"""
    id: int
    nombre: str
    provincia_id: int
    ubigeo: str
    
    model_config = ConfigDict(from_attributes=True)
