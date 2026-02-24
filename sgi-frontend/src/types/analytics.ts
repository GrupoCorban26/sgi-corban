export interface ComericalStats {
    usuario_id: number;
    nombre: string;
    leads_atendidos: number;
    tiempo_respuesta_promedio_seg: number | null;
    clientes_convertidos: number;
    llamadas_realizadas: number;
    gestiones_realizadas: number;
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

export interface GestionStats {
    total_gestiones: number;
    por_tipo: { [tipo: string]: number };
    por_resultado: { [resultado: string]: number };
    tasa_contactabilidad: number;
    clientes_sin_gestion_30d: number;
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
    gestion: GestionStats;
}
