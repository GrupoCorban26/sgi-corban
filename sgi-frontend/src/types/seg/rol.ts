import { Permiso } from './permiso';

export interface RolBase {
    nombre: string;
    descripcion: string | null;
    is_active: boolean;
}

export interface RolCreate extends RolBase {
    permisos_ids: number[];
}

export interface RolUpdate {
    nombre?: string | null;
    descripcion?: string | null;
    is_active?: boolean | null;
    permisos_ids?: number[] | null;
}

export interface Rol extends RolBase {
    id: number;
    permisos: Permiso[];
}
