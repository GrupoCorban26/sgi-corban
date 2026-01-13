// Tipos para Usuarios

export interface Usuario {
    id: number;
    empleado_id: number | null;
    empleado_nombre: string | null;
    correo_corp: string;
    is_active: boolean;
    is_bloqueado: boolean;
    ultimo_acceso: string | null;
    debe_cambiar_pass: boolean;
    roles: string | null;
    total_registros?: number;
}

export interface UsuarioPaginationResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: Usuario[];
}

export interface UsuarioOperationResult {
    success: number;
    message: string;
    id?: number;
}

export interface RolOption {
    id: number;
    nombre: string;
    descripcion?: string | null;
}

export interface EmpleadoSinUsuario {
    id: number;
    nombre_completo: string;
    nro_documento: string;
    area_nombre?: string | null;
    cargo_nombre?: string | null;
}

export interface UsuarioCreate {
    empleado_id: number;
    correo_corp: string;
    password: string;
    roles: number[];
}

export interface UsuarioUpdate {
    correo_corp?: string | null;
    is_active?: boolean | null;
    debe_cambiar_pass?: boolean | null;
    is_bloqueado?: boolean | null;
    roles?: number[] | null;
}

export interface UsuarioDetail extends Usuario {
    intentos_fallidos: number;
    created_at: string | null;
    updated_at: string | null;
    roles_list: RolOption[];
}
