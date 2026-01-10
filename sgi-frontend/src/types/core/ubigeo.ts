// Tipos para Ubigeo (Geográfico del Perú)

export interface DepartamentoGeo {
    id: number;
    nombre: string;
    ubigeo: string;
}

export interface Provincia {
    id: number;
    nombre: string;
    departamento_id: number;
    ubigeo: string;
}

export interface Distrito {
    id: number;
    nombre: string;
    provincia_id: number;
    ubigeo: string;
}
