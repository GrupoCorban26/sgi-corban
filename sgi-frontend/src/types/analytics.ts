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

export interface DashboardAnalytics {
    fecha_inicio: string;
    fecha_fin: string;
    base_datos: BaseDatosStats;
    cartera: CarteraStats;
}
