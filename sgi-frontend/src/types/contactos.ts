export interface Contacto {
    id?: number;
    ruc: string;
    cargo?: string;
    telefono: string;
    email?: string;
    origen?: string;
    is_client: boolean;
    fecha_asignacion?: string;
    asignado_a?: number;
}
