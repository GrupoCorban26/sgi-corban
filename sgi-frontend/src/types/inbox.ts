export interface InboxLead {
    id: number;
    telefono: string;
    mensaje_inicial: string | null;
    nombre_whatsapp: string | null;
    asignado_a: number | null;
    estado: 'PENDIENTE' | 'CONVERTIDO' | 'DESCARTADO';
    fecha_recepcion: string;
    fecha_gestion: string | null;

    // Nested
    nombre_asignado?: string;
    telefono_asignado?: string;
}

export interface InboxConvertRequest {
    cliente_id: number;
}
