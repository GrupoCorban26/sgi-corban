export interface BaseContacto {
    id: number;
    ruc: string;
    razon_social: string;
    telefono: string;
    correo?: string;
    estado: string;
    fob_promedio?: number;
    total_embarques?: number;
    sector?: string;
}

export interface BaseStats {
    total_contactos: number;
    empresas_multi_0_agentes: number;
    contactos_disponibles: number;
    empresas_diferentes: number;
}

export interface BaseResponse {
    total: number;
    page: number;
    page_size: number;
    stats: BaseStats;
    data: BaseContacto[];
}
