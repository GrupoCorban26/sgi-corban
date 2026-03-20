from pydantic import BaseModel
from typing import List, Optional

# =========================================================================
# RADAR COMERCIAL SCHEMAS
# =========================================================================

class RadarKPIs(BaseModel):
    meta_ordenes_equipo: int
    meta_individual: int
    total_gestiones: int
    clientes_nuevos: int


class ProgresoComercial(BaseModel):
    comercial_id: int
    nombre: str
    iniciales: Optional[str] = None
    ordenes_logistico: int
    ordenes_aduanas: int
    ordenes_integral: int
    total_ordenes: int
    meta: int
    porcentaje: float


class PipelineComercial(BaseModel):
    comercial_id: int
    nombre: str
    prospectos: int
    negociacion: int
    cerrada: int
    operacion: int
    carga_entregada: int


class AlertaClienteMuerto(BaseModel):
    cliente_id: int
    cliente_nombre: str
    comercial_id: int
    comercial_nombre: str
    dias_sin_contacto: int


class RadarResponse(BaseModel):
    kpis: RadarKPIs
    progreso_comerciales: List[ProgresoComercial]
    pipeline_comerciales: List[PipelineComercial]
    alertas_clientes_muertos: List[AlertaClienteMuerto]


# =========================================================================
# EMBUDO Y DIAGNÓSTICO SCHEMAS
# =========================================================================

class EtapaEmbudo(BaseModel):
    etapa: str
    cantidad: int
    porcentaje_retencion: float


class MotivoCaida(BaseModel):
    motivo: str
    cantidad: int
    porcentaje: float


class EfectividadOrigen(BaseModel):
    origen: str
    total_leads: int
    cerrados: int
    tasa_conversion: float


class TiempoPromedio(BaseModel):
    etapa: str
    dias_promedio: float


class EmbudoResponse(BaseModel):
    embudo_conversion: List[EtapaEmbudo]
    tiempos_promedio: List[TiempoPromedio]
    motivos_caida: List[MotivoCaida]
    efectividad_origen: List[EfectividadOrigen]
