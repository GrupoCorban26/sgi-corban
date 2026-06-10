from pydantic import BaseModel
from typing import List, Optional, Union

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


# =========================================================================
# RENDIMIENTO COTIZACIONES SCHEMAS
# =========================================================================

class CotizacionesKpis(BaseModel):
    total_tarjetas: int
    total_cotizaciones: int
    total_ganadas: int
    total_perdidas: int
    tasa_conversion: float


class CotizacionDetalleSchema(BaseModel):
    cliente: str
    titulo: str
    tipo_carga: str
    servicio: str
    incoterm: str
    veces_cotizado: int
    estado: str


class ComercialCotizacionesRendimiento(BaseModel):
    comercial_id: int
    nombre: str
    iniciales: Optional[str] = None
    cotizados_creados: int
    cierres_exitosos: int
    negociaciones_caidas: int
    tasa_efectividad: float
    cotizaciones_pendientes: int
    jefe_id: Optional[int] = None
    jefe_nombre: Optional[str] = None
    detalle_cotizaciones: List[CotizacionDetalleSchema] = []


class DistribucionCarga(BaseModel):
    tipo_carga_nombre: str
    cantidad: int
    porcentaje: float


class DistribucionOperacion(BaseModel):
    tipo_operacion: str
    cantidad: int
    porcentaje: float


class DistribucionSegmentacion(BaseModel):
    segmentacion_nombre: str
    cantidad: int
    porcentaje: float


class TopMotivoCaida(BaseModel):
    motivo: str
    cantidad: int
    porcentaje: float


class EmpresaCotizacionesRendimiento(BaseModel):
    cliente_id: Union[int, str]
    nombre: str
    cotizados_creados: int
    cierres_exitosos: int
    negociaciones_caidas: int
    tasa_efectividad: float
    cotizaciones_pendientes: int


class CotizacionesAnalyticsResponse(BaseModel):
    kpis: CotizacionesKpis
    rendimiento_comerciales: List[ComercialCotizacionesRendimiento]
    rendimiento_empresas: List[EmpresaCotizacionesRendimiento]
    distribucion_carga: List[DistribucionCarga]
    distribucion_operacion: List[DistribucionOperacion]
    distribucion_segmentacion: List[DistribucionSegmentacion]
    motivos_caida: List[TopMotivoCaida]
