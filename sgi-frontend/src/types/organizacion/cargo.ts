// Tipos para Cargos

export interface Cargo {
    id: number;
    nombre: string;
    descripcion?: string | null;
    area_id: number;
    area_nombre?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CargoPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Cargo[];
}

export interface CargoOperationResult {
    success: number;
    message: string;
    id?: number;
}

export interface CargoOption {
    id: number;
    nombre: string;
}
