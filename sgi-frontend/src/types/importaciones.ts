export interface Importacion {
    id?: number;
    ruc?: string;
    razon_social?: string;
    sector?: string;
    score?: number;
    agentes_distintos?: number;
    total_embarques?: number;
    meses_activos?: number;
    fob_promedio?: number;
    via_predominante?: string;
    paises_principales?: string;
    ultima_importacion?: string;
    dias_desde_ultima?: number;
}

export interface ImportacionResponse {
    data: Importacion[];
    total: number;
    page: number;
    page_size: number;
}
