export interface Contacto {
    id?: number;
    ruc: string;
    razon_social?: string;
    cargo?: string;
    telefono: string;
    correo?: string;
    origen?: string;
    is_client: boolean;
    caso_id?: number;
    caso?: string;
    contestado?: string;
    estado?: string;
    lote_nombre?: string;
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


export interface KpisGestion {
    total_repartido: number;
    tasa_contactabilidad: number;
    tasa_positivos: number;
    casos_distribucion: { name: string; value: number }[];
}

export interface Lote {
    id: number;
    nombre: string;
    is_active: boolean;
    total_contactos: number;
    disponibles: number;
    created_by_nombre?: string;
    created_at: string;
}
