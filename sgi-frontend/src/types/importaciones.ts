export interface Importacion {
    id?: number;
    ruc?: string;
    razon_social?: string;
    fob_datasur_mundo?: number;
    fob_sunat_china?: number;
    fob_total_real?: number;
    transacciones_datasur?: number;
    paises_origen?: string;
    partidas_arancelarias?: string;
    importa_de_china?: string;
}

export interface ImportacionResponse {
    data: Importacion[];
    total: number;
    page: number;
    page_size: number;
}
