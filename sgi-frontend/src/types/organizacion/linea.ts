// Tipos para Líneas Corporativas

export interface Linea {
    id: number;
    numero: string;
    gmail: string;
    operador?: string | null;
    plan?: string | null;
    proveedor?: string | null;
    activo_id?: number | null;
    activo_nombre?: string | null;
    activo_serie?: string | null;
    empleado_id?: number | null;
    empleado_nombre?: string | null;
    fecha_asignacion?: string | null;
    is_active: boolean;
    observaciones?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface LineaPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Linea[];
}

export interface LineaOperationResult {
    success: boolean;
    message: string;
    id?: number;
}

export interface LineaCreate {
    numero: string;
    gmail: string;
    operador?: string | null;
    plan?: string | null;
    proveedor?: string | null;
    activo_id?: number | null;
    /** @deprecated Empleado is now derived from activo assignment */
    empleado_id?: number | null;
    observaciones?: string | null;
}

export interface LineaUpdate {
    numero?: string;
    gmail?: string;
    operador?: string | null;
    plan?: string;
    proveedor?: string;
    observaciones?: string | null;
}

export interface CambiarCelularRequest {
    nuevo_activo_id: number;
    observaciones?: string | null;
}

export interface AsignarEmpleadoRequest {
    empleado_id: number;
    observaciones?: string | null;
}

export interface LineaHistorial {
    id: number;
    tipo_cambio: string;
    activo_anterior_nombre?: string | null;
    activo_nuevo_nombre?: string | null;
    empleado_anterior_nombre?: string | null;
    empleado_nuevo_nombre?: string | null;
    observaciones?: string | null;
    registrado_por_nombre?: string | null;
    fecha_cambio: string;
}

export interface LineaDropdown {
    id: number;
    numero: string;
    gmail: string;
}
