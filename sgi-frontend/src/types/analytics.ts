export interface BaseDatosComercial {
    usuario_id: number;
    nombre: string;
    total_llamadas: number;
    llamadas_contestadas: number;
    llamadas_efectivas: number;
}

export interface BaseDatosStats {
    totales: {
        total_llamadas: number;
        llamadas_contestadas: number;
        llamadas_efectivas: number;
        pct_contestadas: number;
        pct_efectivas: number;
    };
    por_comercial: BaseDatosComercial[];
}

export interface CarteraComercial {
    usuario_id: number;
    nombre: string;
    seguimiento_carga: number;
    fidelizacion: number;
    dudas_cliente: number;
    quiere_cotizacion: number;
}

export interface CarteraStats {
    totales: {
        total_llamadas: number;
        total_clientes_gestionados: number;
    };
    por_comercial: CarteraComercial[];
}

export interface BuzonComercial {
    usuario_id: number;
    nombre: string;
    leads_asignados: number;
    convertidos: number;
    descartados: number;
    en_gestion: number;
    avg_tiempo_respuesta_seg: number;
    tasa_conversion: number;
}

export interface BuzonStats {
    totales: {
        total_leads: number;
        total_convertidos: number;
        total_descartados: number;
        total_sin_respuesta: number;
        tasa_conversion: number;
        tasa_abandono: number;
        avg_tiempo_respuesta_seg: number;
    };
    por_comercial: BuzonComercial[];
}

export interface DashboardAnalytics {
    fecha_inicio: string;
    fecha_fin: string;
    base_datos: BaseDatosStats;
    cartera: CarteraStats;
    buzon: BuzonStats;
}
