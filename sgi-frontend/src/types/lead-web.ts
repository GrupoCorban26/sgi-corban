// Tipos para Leads Web

export type EstadoLeadWeb = 'NUEVO' | 'PENDIENTE' | 'EN_GESTION' | 'CONVERTIDO' | 'DESCARTADO';

export interface LeadWeb {
    id: number;
    nombre: string;
    correo: string;
    telefono: string;
    asunto: string;
    mensaje: string;
    pagina_origen: string;
    servicio_interes: string | null;

    // Asignación
    asignado_a: number | null;
    nombre_asignado: string | null;
    estado: EstadoLeadWeb;

    // Fechas
    fecha_recepcion: string;
    fecha_asignacion: string | null;
    fecha_gestion: string | null;

    // Notas
    notas: string | null;

    // Conversión
    cliente_convertido_id: number | null;

    // Tracking
    tiempo_respuesta_segundos: number | null;
}

export interface LeadWebFiltros {
    estado?: EstadoLeadWeb | '';
    pagina_origen?: string;
    filtro_comercial_id?: number | '';
}

export interface LeadWebDescartarRequest {
    motivo_descarte: string;
    comentario_descarte: string;
}

export interface LeadWebConvertirRequest {
    cliente_id?: number;
    crear_prospecto?: boolean;
}
