// Types para comercial/base
export interface ContactoAsignado {
    id: number;
    ruc: string;
    nombre: string | null;
    razon_social: string;
    telefono: string;
    correo: string | null;
    cargo: string | null;
    contesto: number; // 0 o 1
    caso_id: number | null;
    caso_nombre: string | null;
    comentario: string | null;
    estado: string;
    fecha_asignacion: string;
    historial_id: number;
    completado: boolean;
    lote_nombre: string | null;
}

export interface CasoLlamada {
    id: number;
    nombre: string;
    contestado: boolean;
    is_positive?: boolean; // deprecated, use gestionable instead
    gestionable?: boolean;
}

export interface FiltroBase {
    pais: string;
    cantidad: number;
}

export interface SectorFiltro {
    sector: string;
    cantidad: number;
}

export interface FiltrosBaseResponse {
    paises: FiltroBase[];
    sectores: SectorFiltro[];
}

export interface CargarBaseResponse {
    success: boolean;
    contactos: ContactoAsignado[];
    cantidad: number;
    contactos_liberados?: number;
    rucs_excluidos?: Record<string, number>; // { "PERDIDO": 5, "INACTIVO": 12 }
}

export interface FeedbackPayload {
    caso_id: number;
    comentario: string;
}

export interface FeedbackResponse {
    success: boolean;
    mensaje?: string;
}
