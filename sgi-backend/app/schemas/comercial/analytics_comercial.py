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
    total_cotizaciones: int          # Sum of all individual active Cotizacion records
    total_cargas_cotizadas: int      # Count of Seguimiento (tarjetas)
    total_clientes_gestionados: int  # Count DISTINCT cliente_id
    total_cierres: int               # Tarjetas in CIERRE + EN_OPERACION + CARGA_ENTREGADA
    total_en_operacion: int          # Tarjetas in EN_OPERACION + CARGA_ENTREGADA
    total_caidos: int                # Tarjetas in CAIDO
    tasa_conversion: float           # total_cierres / (total_cierres + total_caidos) * 100


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
    cotizaciones_totales: int       # SUM of active cotizaciones
    cargas_cotizadas: int           # COUNT of tarjetas
    clientes_gestionados: int       # COUNT DISTINCT of cliente_id
    cierres: int                    # Tarjetas in CIERRE + EN_OPERACION + CARGA_ENTREGADA
    en_operacion: int               # Tarjetas in EN_OPERACION + CARGA_ENTREGADA
    caidos: int                     # Tarjetas in CAIDO
    tasa_conversion: float          # cierres / (cierres + caidos) * 100
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
    cotizaciones_totales: int
    cargas_cotizadas: int
    cierres: int
    en_operacion: int
    caidos: int
    tasa_conversion: float


class CotizacionesAnalyticsResponse(BaseModel):
    kpis: CotizacionesKpis
    rendimiento_comerciales: List[ComercialCotizacionesRendimiento]
    rendimiento_empresas: List[EmpresaCotizacionesRendimiento]
    distribucion_carga: List[DistribucionCarga]
    distribucion_operacion: List[DistribucionOperacion]
    distribucion_segmentacion: List[DistribucionSegmentacion]
    motivos_caida: List[TopMotivoCaida]
