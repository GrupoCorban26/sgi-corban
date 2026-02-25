// ============================================================
// TIPOS — CITAS Y SALIDAS A CAMPO
// ============================================================

export interface ComercialAsignado {
    id: number;
    usuario_id: number;
    nombre: string;
    confirmado: boolean;
}

export interface Cita {
    id: number;
    tipo_agenda: 'INDIVIDUAL' | 'SALIDA_CAMPO';
    cliente_id?: number;
    comercial_id: number;
    fecha: string;
    hora: string;
    tipo_cita: string;
    direccion: string;
    motivo: string;
    objetivo_campo?: string;
    con_presente: boolean;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'TERMINADO';
    motivo_rechazo?: string;
    acompanado_por_id?: number;
    conductor_id?: number;

    // Expandidos
    cliente_razon_social?: string;
    comercial_nombre?: string;
    acompanante_nombre?: string;
    conductor_info?: string;
    comerciales_asignados?: ComercialAsignado[];

    created_at: string;
}

export interface CitaCreate {
    cliente_id: number;
    fecha: string;
    hora: string;
    tipo_cita: string;
    direccion: string;
    motivo: string;
    con_presente: boolean;
}

export interface CitaUpdate {
    fecha?: string;
    hora?: string;
    tipo_cita?: string;
    direccion?: string;
    motivo?: string;
    con_presente?: boolean;
}

export interface SalidaCampoCreate {
    fecha: string;
    hora: string;
    direccion?: string;
    objetivo_campo: string;
    comerciales_ids: number[];
    con_presente: boolean;
}

export interface SalidaCampoUpdate {
    fecha?: string;
    hora?: string;
    direccion?: string;
    objetivo_campo?: string;
    comerciales_ids?: number[];
    con_presente?: boolean;
}

export interface CitaAprobar {
    acompanado_por_id?: number;
    ira_solo?: boolean;
    conductor_id?: number;
}

export interface CitaRechazar {
    motivo_rechazo: string;
}

export interface ComercialDropdown {
    id: number;
    nombre: string;
}
