export interface Area {
    id: number;
    nombre: string;
    descripcion?: string;
    parent_area_id?: number;
    responsable_id?: number;
    comisiona_ventas: boolean;
    is_active: boolean;
    created_at?: string;
}

export interface AreaPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Area[];
}

export interface OperationResult {
    success: number;
    message: string;
    id?: number;
}