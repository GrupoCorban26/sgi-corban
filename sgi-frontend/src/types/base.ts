export interface BaseContacto {
    id: number;
    ruc: string;
    razon_social: string;
    telefono: string;
    correo?: string;
    estado: string;
    fob_total_real?: number;
    transacciones_datasur?: number;
    importa_de_china?: string;
}

export interface BaseStats {
    empresas_transacciones: number;
    empresas_con_telefono: number;
    total_contactos: number;
}

export interface BaseResponse {
    total: number;
    page: number;
    page_size: number;
    stats: BaseStats;
    data: BaseContacto[];
}
