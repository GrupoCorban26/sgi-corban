export interface Contacto {
    id?: number;
    ruc: string;
    razon_social?: string;
    cargo?: string;
    telefono: string;
    email?: string;
    correo?: string;
    origen?: string;
    is_client: boolean;
    caso_id?: number;
    caso?: string;
    contestado?: string;
    estado?: string;
    fecha_asignacion?: string;
    asignado_a?: number;
    created_at?: string;
}

export interface ContactoStats {
    total_registros: number;
    disponibles: number;
    asignados: number;
    en_gestion: number;
    total_filtrado: number;
}

export interface ContactosListResponse {
    stats: ContactoStats;
    page: number;
    page_size: number;
    data: Contacto[];
}

