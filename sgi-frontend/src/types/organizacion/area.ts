// types/organizacion/area.ts

export interface Area {
    id: number;
    nombre: string;
    descripcion?: string | null;
    departamento_id: number;
    departamento_nombre?: string | null;
    area_parent_id?: number | null;
    area_padre_nombre?: string | null;
    responsable_id?: number | null;
    responsable_nombre?: string | null;
    is_active?: boolean;
    total_registros?: number;
}

export interface AreaPaginationResponse {
    data: Area[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface AreaOperationResult {
    success: boolean;
    message: string;
    id?: number;
}

export interface AreaOption {
    id: number;
    nombre: string;
}