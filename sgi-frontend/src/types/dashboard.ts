/**
 * Tipos para el Dashboard consolidado de Reportes.
 */

export interface DashboardKPIs {
    llamadas_total: number;
    llamadas_contestadas: number;
    llamadas_efectivas: number;
    pct_contestadas: number;
    pct_efectivas: number;
    leads_buzon: number;
    leads_convertidos: number;
    leads_descartados: number;
    leads_en_gestion: number;
    pct_conversion: number;
    avg_tiempo_respuesta_min: number;
    cartera_gestiones: number;
    cartera_clientes_unicos: number;
}

export interface DashboardTendencias {
    [key: string]: number;
}

export interface DashboardActividadDia {
    fecha: string;
    llamadas_base: number;
    llamadas_cartera: number;
}

export interface DashboardComercial {
    nombre: string;
    total_llamadas: number;
    contestadas: number;
    efectivas: number;
    leads_asignados: number;
    convertidos: number;
    gestiones_cartera: number;
    gestiones_llamada: number;
    gestiones_whatsapp: number;
    gestiones_correo: number;
    gestiones_otro: number;
}

export interface DashboardData {
    periodo_actual: DashboardKPIs;
    periodo_anterior: DashboardKPIs | null;
    tendencias: DashboardTendencias | null;
    por_dia: DashboardActividadDia[];
    por_comercial: DashboardComercial[];
    descartes_buzon: { motivo: string; cantidad: number }[];
    casos_contestadas: { motivo: string; cantidad: number }[];
    casos_no_contestadas: { motivo: string; cantidad: number }[];
}
