export interface Importacion {
    id?: number;
    ruc?: string;
    razon_social?: string;
    fob_anual_usd?: number;
    flete_anual_usd?: number;
    flete_x_kg_usd?: number;
    peso_anual_kg?: number;
    embarques_anuales?: number;
    agentes_distintos?: number;
    meses_distintos?: number;
    categoria_frecuencia?: string;
    prox_embarque_estimado?: string;
    paises_origen?: string;
    aduanas?: string;
}

export interface ImportacionResponse {
    data: Importacion[];
    total: number;
    page: number;
    page_size: number;
}
