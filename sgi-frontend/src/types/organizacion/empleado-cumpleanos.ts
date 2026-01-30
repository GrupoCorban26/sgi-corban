export interface EmpleadoCumpleanos {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    fecha_nacimiento: string; // ISO date string yyyy-mm-dd
    cargo_nombre: string | null;
    area_nombre: string | null;
}
