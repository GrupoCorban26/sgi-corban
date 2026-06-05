// =========================================================================
// RADAR COMERCIAL
// =========================================================================

export interface RadarKPIs {
  meta_ordenes_equipo: number;
  meta_individual: number;
  total_gestiones: number;
  clientes_nuevos: number;
}

export interface ProgresoComercial {
  comercial_id: number;
  nombre: string;
  iniciales: string | null;
  ordenes_logistico: number;
  ordenes_aduanas: number;
  ordenes_integral: number;
  total_ordenes: number;
  meta: number;
  porcentaje: number;
}

export interface PipelineComercial {
  comercial_id: number;
  nombre: string;
  prospectos: number;
  negociacion: number;
  cerrada: number;
  operacion: number;
  carga_entregada: number;
}

export interface AlertaClienteMuerto {
  cliente_id: number;
  cliente_nombre: string;
  comercial_id: number;
  comercial_nombre: string;
  dias_sin_contacto: number;
}

export interface RadarResponse {
  kpis: RadarKPIs;
  progreso_comerciales: ProgresoComercial[];
  pipeline_comerciales: PipelineComercial[];
  alertas_clientes_muertos: AlertaClienteMuerto[];
}

// =========================================================================
// EMBUDO Y DIAGNÓSTICO
// =========================================================================

export interface EtapaEmbudo {
  etapa: string;
  cantidad: number;
  porcentaje_retencion: number;
}

export interface ZeitPromedio { // Se mantiene por retrocompatibilidad
  etapa: string;
  dias_promedio: number;
}

export interface TiempoPromedio {
  etapa: string;
  dias_promedio: number;
}

export interface MotivoCaida {
  motivo: string;
  cantidad: number;
  porcentaje: number;
}

export interface EfectividadOrigen {
  origen: string;
  total_leads: number;
  cerrados: number;
  tasa_conversion: number;
}

export interface EmbudoResponse {
  embudo_conversion: EtapaEmbudo[];
  tiempos_promedio: TiempoPromedio[];
  motivos_caida: MotivoCaida[];
  efectividad_origen: EfectividadOrigen[];
}

// =========================================================================
// RENDIMIENTO COTIZACIONES KANBAN
// =========================================================================

export interface CotizacionesKpis {
  total_tarjetas: number;
  total_cotizaciones: number;
  total_ganadas: number;
  total_perdidas: number;
  tasa_conversion: number;
}

export interface ComercialCotizacionesRendimiento {
  comercial_id: number;
  nombre: string;
  iniciales: string | null;
  cotizados_creados: number;
  cierres_exitosos: number;
  negociaciones_caidas: number;
  tasa_efectividad: number;
  cotizaciones_pendientes: number;
  jefe_id?: number | null;
  jefe_nombre?: string | null;
}

export interface DistribucionCarga {
  tipo_carga_nombre: string;
  cantidad: number;
  porcentaje: number;
}

export interface DistribucionOperacion {
  tipo_operacion: string;
  cantidad: number;
  porcentaje: number;
}

export interface DistribucionSegmentacion {
  segmentacion_nombre: string;
  cantidad: number;
  porcentaje: number;
}

export interface TopMotivoCaida {
  motivo: string;
  cantidad: number;
  porcentaje: number;
}

export interface EmpresaCotizacionesRendimiento {
  cliente_id: number;
  nombre: string;
  cotizados_creados: number;
  cierres_exitosos: number;
  negociaciones_caidas: number;
  tasa_efectividad: number;
  cotizaciones_pendientes: number;
}

export interface CotizacionesAnalyticsResponse {
  kpis: CotizacionesKpis;
  rendimiento_comerciales: ComercialCotizacionesRendimiento[];
  rendimiento_empresas: EmpresaCotizacionesRendimiento[];
  distribucion_carga: DistribucionCarga[];
  distribucion_operacion: DistribucionOperacion[];
  distribucion_segmentacion: DistribucionSegmentacion[];
  motivos_caida: TopMotivoCaida[];
}
