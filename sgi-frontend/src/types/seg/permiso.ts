export interface Permiso {
    id: number;
    nombre_tecnico: string;
    nombre_display: string;
    modulo: string | null;
    descripcion: string | null;
    is_active: boolean;
}
