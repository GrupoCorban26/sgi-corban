export interface Importacion {
    id?: number;
    ruc?: string;
    anio?: string;
    razon_social?: string;
    aduanas?: string;
    via_transporte?: string;
    paises_origen?: string;
    puertos_embarque?: string;
    embarcadores?: string;
    agente_aduanas?: string;
    partida_arancelaria_cod?: string;
    partida_arancelaria_descripcion?: string;
    fob_min?: number;
    fob_max?: number;
    fob_prom?: number;
    fob_anual?: number;
    total_operaciones?: number;
    cantidad_agentes?: number;
    cantidad_paises?: number;
    cantidad_partidas?: number;
    primera_importacion?: string;
    ultima_importacion?: string;
    // Alias para compatibilidad con diferentes formatos
    año?: string;
}

export interface ImportacionResponse {
    data: Importacion[];
    total: number;
    page: number;
    page_size: number;
}
