// Tipos para el módulo de Productos de Oficina

export interface CategoriaProductoOficina {
    id: number;
    nombre: string;
    descripcion: string | null;
    is_active: boolean;
    cantidad_productos: number;
}

export interface ProductoOficina {
    id: number;
    nombre: string;
    categoria_id: number | null;
    categoria_nombre: string | null;
    unidad_medida: string;
    stock_actual: number;
    stock_minimo: number;
    precio_unitario: number | null;
    ubicacion: string | null;
    observaciones: string | null;
    is_active: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface ProductoOficinaCreate {
    nombre: string;
    categoria_id?: number | null;
    unidad_medida?: string;
    stock_actual?: number;
    stock_minimo?: number;
    precio_unitario?: number | null;
    ubicacion?: string;
    observaciones?: string;
}

export interface ProductoOficinaUpdate {
    nombre?: string;
    categoria_id?: number | null;
    unidad_medida?: string;
    stock_minimo?: number;
    precio_unitario?: number | null;
    ubicacion?: string;
    observaciones?: string;
}

export interface ProductoOficinaPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: ProductoOficina[];
}

export interface AjusteStockRequest {
    cantidad: number;
    motivo: string;
}

export interface CategoriaCreate {
    nombre: string;
    descripcion?: string;
}

export interface CategoriaUpdate {
    nombre?: string;
    descripcion?: string;
}

export interface OperationResult {
    success: boolean;
    message: string;
    id?: number;
}
