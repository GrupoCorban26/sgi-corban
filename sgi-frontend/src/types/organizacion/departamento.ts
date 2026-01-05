// types/departamento.ts
export interface Departamento {
  id: number;
  nombre: string;
  descripcion?: string;
  responsable_id?: number;
  responsable_name?: string;
  is_active: boolean;
}

export interface PaginationResponse {
  data: Departamento[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface OperationResult {
  success: boolean;
  message: string;
  id?: number;
}