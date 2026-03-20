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
