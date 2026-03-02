export interface ReporteLlamadaResponse {
    id: number;
    ruc: string;
    razon_social: string;
    telefono: string;
    contesto: boolean;
    caso_nombre: string;
    comentario: string | null;
    comercial_nombre: string;
    fecha_llamada: string; // ISO datetime
}

export interface ReporteLlamadaPaginated {
    total: number;
    page: number;
    page_size: number;
    data: ReporteLlamadaResponse[];
}
