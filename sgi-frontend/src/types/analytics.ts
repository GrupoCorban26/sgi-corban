export interface ComericalStats {
    usuario_id: number;
    nombre: string;
    leads_atendidos: number;
    tiempo_respuesta_promedio_min: number | null;
    clientes_convertidos: number;
    llamadas_realizadas: number;
    tasa_conversion: number;
}

export interface EmbudoStats {
    [estado: string]: number;
}

export interface PipelineStats {
    embudo: EmbudoStats;
    tasa_conversion: number;
    tasa_perdida: number;
    tiempo_promedio_por_etapa: {
        [etapa: string]: number;
    };
    reactivaciones_exitosas: number;
}

export interface OrigenStats {
    total: number;
    convertidos: number;
    tasa_conversion: number;
}

export interface OperativoStats {
    citas_cumplimiento: number;
    citas_total: number;
    citas_terminadas: number;
    leads_pendientes: number;
    clientes_nuevos_periodo: number;
    tendencia_semanal: number[];
}

export interface DashboardAnalytics {
    fecha_inicio: string;
    fecha_fin: string;
    pipeline: PipelineStats;
    comerciales: ComericalStats[];
    origenes: {
        [origen: string]: OrigenStats;
    };
    operativo: OperativoStats;
}
