// Tipos para Empleados

export interface Empleado {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno?: string | null;
    fecha_nacimiento?: string | null;
    tipo_documento?: string | null;
    nro_documento?: string | null;
    celular?: string | null;
    email_personal?: string | null;
    distrito_id?: number | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null; // Departamento geográfico (ubigeo)
    direccion?: string | null;
    fecha_ingreso?: string | null;
    fecha_cese?: string | null;
    is_active: boolean;
    cargo_id?: number | null;
    cargo_nombre?: string | null;
    area_id?: number | null;
    area_nombre?: string | null;
    departamento_id?: number | null;
    departamento_nombre?: string | null; // Departamento organizacional
    jefe_id?: number | null;
    jefe_nombre?: string | null;
    empresa?: string | null;
}

export interface EmpleadoPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Empleado[];
}

export interface EmpleadoOperationResult {
    success: number;
    message: string;
    id?: number;
}

export interface EmpleadoOption {
    id: number;
    nombre_completo: string;
}

export interface EmpleadoCreate {
    nombres: string;
    apellido_paterno: string;
    apellido_materno?: string | null;
    fecha_nacimiento?: string | null;
    tipo_documento?: string;
    nro_documento: string;
    celular?: string | null;
    email_personal?: string | null;
    distrito_id: number;
    direccion?: string | null;
    fecha_ingreso: string;
    cargo_id: number;
    area_id: number;
    departamento_id: number;
    jefe_id?: number | null;
    empresa?: string;
}

export interface EmpleadoUpdate {
    nombres?: string;
    apellido_paterno?: string;
    apellido_materno?: string | null;
    fecha_nacimiento?: string | null;
    tipo_documento?: string;
    nro_documento?: string;
    celular?: string | null;
    email_personal?: string | null;
    distrito_id?: number;
    direccion?: string | null;
    fecha_ingreso?: string;
    cargo_id?: number;
    area_id?: number;
    departamento_id?: number;
    jefe_id?: number | null;
    empresa?: string;
}
