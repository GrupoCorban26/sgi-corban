export interface Cliente {
    id: number;
    ruc: string | null;
    razon_social: string;
    direccion_fiscal: string | null;
    distrito_id: number | null;
    estado_id: number | null;
    origen_id: number | null;
    proxima_fecha_contacto: string | null;
    comercial_encargado_id: number | null;
    comercial_nombre: string | null;
    estado_nombre: string | null;
    origen_nombre: string | null;
    // Campos de contacto principal (resueltos por el service)
    telefono: string | null;
    correo: string | null;
    nombre_contacto: string | null;
    is_active: boolean;
    created_at: string | null;
    updated_at: string | null;
    ultimo_comentario: string | null;
}

export interface ClienteCreate {
    ruc?: string | null;
    razon_social: string;
    direccion_fiscal?: string | null;
    distrito_id?: number | null;
    estado_id?: number | null;
    origen_id?: number | null;
    proxima_fecha_contacto?: string | null;
}

export interface ClienteUpdate {
    ruc?: string | null;
    razon_social?: string;
    direccion_fiscal?: string | null;
    distrito_id?: number | null;
    estado_id?: number | null;
    origen_id?: number | null;
    proxima_fecha_contacto?: string | null;
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
    motivo: string;
    fecha_seguimiento?: string | null;
}

export interface ClienteCambiarEstado {
    nuevo_estado_id: number;
    motivo?: string | null;
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
