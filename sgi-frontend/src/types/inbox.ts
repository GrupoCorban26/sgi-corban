export interface InboxLead {
    id: number;
    telefono: string;
    nombre_whatsapp: string | null;
    asignado_a: number | null;
    estado: 'BOT' | 'NUEVO' | 'PENDIENTE' | 'EN_GESTION' | 'COTIZADO' | 'CERRADO' | 'DESCARTADO';

    // Nested
    nombre_asignado?: string;
    telefono_asignado?: string;
}

export interface InboxConvertRequest {
    cliente_id: number;
}
