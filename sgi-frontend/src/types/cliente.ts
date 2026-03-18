export interface Cliente {
    id: number;
    ruc: string | null;
    razon_social: string;
    nombre_comercial: string | null;
    direccion_fiscal: string | null;
    distrito_id: number | null;
    area_encargada_id: number | null;
    area_nombre: string | null;
    comercial_encargado_id: number | null;
    comercial_nombre: string | null;
    ultimo_contacto: string | null;
    comentario_ultima_llamada: string | null;
    proxima_fecha_contacto: string | null;
    tipo_estado: 'PROSPECTO' | 'EN_NEGOCIACION' | 'CERRADA' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO' | 'INACTIVO';
    motivo_perdida?: string | null;
    fecha_perdida?: string | null;
    fecha_reactivacion?: string | null;
    origen: string | null;
    is_active: boolean;
    created_at: string | null;
    telefono?: string | null;
    correo?: string | null;
}

export interface ClienteCreate {
    ruc?: string | null;
    razon_social: string;
    nombre_comercial?: string | null;
    direccion_fiscal?: string | null;
    distrito_id?: number | null;
    tipo_estado?: string;
    origen?: string | null;
    ultimo_contacto: string;
    comentario_ultima_llamada: string;
    proxima_fecha_contacto: string;
}

export interface ClienteUpdate {
    ruc?: string | null;
    razon_social?: string;
    nombre_comercial?: string | null;
    direccion_fiscal?: string | null;
    distrito_id?: number | null;
    tipo_estado?: string;
    origen?: string | null;
    ultimo_contacto?: string;
    comentario_ultima_llamada?: string;
    proxima_fecha_contacto?: string;
    area_encargada_id?: number | null;
    comercial_encargado_id?: number | null;
}

export interface ClienteStats {
    total: number;
    prospectos: number;
    en_negociacion: number;
    cerradas: number;
    en_operacion: number;
    carga_entregada: number;
    caidos: number;
    inactivos: number;
    nuevos_clientes: number;
}

export interface ClienteMarcarCaido {
    motivo_caida: string;
    fecha_seguimiento_caida?: string | null;
}

export interface ClienteCambiarEstado {
    nuevo_estado: string;
}

export interface ClientePaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Cliente[];
}

export interface ClienteOperationResult {
    success: number;
    id?: number;
    message: string;
}

export interface ClienteDropdown {
    id: number;
    razon_social: string;
    ruc: string | null;
}
