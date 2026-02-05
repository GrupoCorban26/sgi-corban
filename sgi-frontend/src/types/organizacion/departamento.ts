import { EmpleadoOption } from "./empleado";

export interface Departamento {
  id: number;
  nombre: string;
  descripcion?: string | null;
  responsable_id?: number | null;
  responsable_nombre?: EmpleadoOption;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// Alineado con el backend (DepartamentoPaginationResponse)
export interface DepartamentoPaginationResponse {
  data: Departamento[];
  total: number;
  page: number;
  registro_por_pagina: number;
  total_pages: number;
}

export interface OperationResult {
  success: boolean;
  message: string;
  id?: number;
}

export interface DepartamentoOption {
  id: number;
  nombre: string;
}

export interface DepartamentoCreate {
  nombre: string;
  descripcion?: string | null;
  responsable_id?: number | null;
}

export interface DepartamentoUpdate {
  nombre?: string;
  descripcion?: string | null;
  responsable_id?: number | null;
}