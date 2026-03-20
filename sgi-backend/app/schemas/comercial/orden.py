from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class OrdenResponse(BaseModel):
    id: int
    numero_base: int
    empresa_origen: str
    codigo_sispac: Optional[str] = None
    codigo_sintad: Optional[str] = None
    nro_orden_sintad: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    tipo_servicio: str
    consignatario: Optional[str] = None
    comercial_iniciales: Optional[str] = None
    comercial_id: Optional[int] = None
    comercial_nombre: Optional[str] = None
    cliente_id: Optional[int] = None
    estado_sispac: Optional[str] = None
    estado_sintad: Optional[str] = None
    es_casa: bool = False
    periodo: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    """Resultado de una importación de Excel."""
    total_filas: int = 0
    nuevas: int = 0
    actualizadas: int = 0
    errores: int = 0
    detalle_errores: list[str] = Field(default_factory=list)


class ResumenComercial(BaseModel):
    """Resumen de órdenes por comercial para un periodo."""
    comercial_id: Optional[int] = None
    comercial_nombre: str
    comercial_iniciales: Optional[str] = None
    total_ordenes: int = 0
    ordenes_carga: int = 0
    ordenes_aduanas: int = 0
    ordenes_integral: int = 0
    meta: int = 20
    porcentaje_meta: float = 0.0


class ResumenPeriodo(BaseModel):
    """Resumen general de un periodo."""
    periodo: str
    total_ordenes: int = 0
    total_sin_casa: int = 0
    por_tipo_servicio: dict[str, int] = Field(default_factory=dict)
    por_empresa: dict[str, int] = Field(default_factory=dict)
    comerciales: list[ResumenComercial] = Field(default_factory=list)
