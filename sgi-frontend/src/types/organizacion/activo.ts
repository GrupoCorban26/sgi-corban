// Tipos para el módulo de Activos (Inventario)

export interface Activo {
    id: number;
    producto: string;
    marca: string | null;
    modelo: string | null;
    serie: string | null;
    codigo_inventario: string | null;
    estado_id: number;
    estado_nombre: string | null;
    is_disponible: boolean;
    is_active: boolean;
    observaciones: string | null;
    created_at: string | null;
    updated_at: string | null;
    // Datos de asignación
    empleado_asignado_id: number | null;
    empleado_asignado_nombre: string | null;
    fecha_asignacion: string | null;
}

export interface ActivoCreate {
    producto: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    codigo_inventario?: string;
    estado_id: number;
    observaciones?: string;
}

export interface ActivoUpdate {
    producto?: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    codigo_inventario?: string;
    observaciones?: string;
}

export interface CambioEstadoRequest {
    estado_nuevo: string;
    motivo: string;
    observaciones?: string;
}

export interface ActivoPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Activo[];
}

export interface ActivoHistorial {
    id: number;
    activo_id: number;
    estado_anterior: string | null;
    estado_nuevo: string;
    motivo: string;
    observaciones: string | null;
    empleado_activo_id: number | null;
    registrado_por: number | null;
    registrado_por_nombre: string | null;
    fecha_cambio: string;
}

export interface ActivoOperationResult {
    success: boolean;
    message: string;
    id?: number;
}

export interface ActivoDropdown {
    id: number;
    descripcion: string;
}

export interface AsignacionActivoRequest {
    empleado_id: number;
    observaciones?: string;
}

export interface DevolucionActivoRequest {
    estado_al_devolver: string;
    motivo: string;
    observaciones?: string;
}

export interface AsignacionResponse {
    id: number;
    activo_id: number;
    empleado_id: number;
    empleado_nombre: string;
    fecha_entrega: string;
    fecha_devolucion?: string | null;
    estado_al_entregar: string;
    estado_al_devolver?: string | null;
    observaciones?: string | null;
}
