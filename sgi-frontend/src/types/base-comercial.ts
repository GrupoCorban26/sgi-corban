// Types para comercial/base
export interface ContactoAsignado {
    id: number;
    ruc: string;
    razon_social: string;
    telefono: string;
    correo: string | null;
    contesto: number; // 0 o 1
    caso_id: number | null;
    caso_nombre: string | null;
    comentario: string | null;
    estado: string;
    fecha_asignacion: string;
}

export interface CasoLlamada {
    id: number;
    nombre: string;
    contestado: boolean;
    is_positive: boolean;
}

export interface FiltroBase {
    pais: string;
    cantidad: number;
}

export interface PartidaFiltro {
    partida: string;
    cantidad: number;
}

export interface FiltrosBaseResponse {
    paises: FiltroBase[];
    partidas: PartidaFiltro[];
}

export interface CargarBaseResponse {
    success: boolean;
    contactos: ContactoAsignado[];
    cantidad: number;
}

export interface FeedbackPayload {
    caso_id: number;
    comentario: string;
}
