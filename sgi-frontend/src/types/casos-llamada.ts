export interface CasoLlamada {
    id: number;
    nombre: string;
    contestado: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CasoLlamadaCreate {
    nombre: string;
    contestado?: boolean;
}

export interface CasoLlamadaUpdate {
    nombre?: string;
    contestado?: boolean;
}
