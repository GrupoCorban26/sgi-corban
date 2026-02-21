export interface ChatMessage {
    id: number;
    inbox_id: number;
    telefono: string;
    direccion: 'ENTRANTE' | 'SALIENTE';
    remitente_tipo: 'CLIENTE' | 'COMERCIAL' | 'BOT';
    remitente_id: number | null;
    contenido: string;
    whatsapp_msg_id: string | null;
    estado_envio: string | null;
    leido: boolean;
    created_at: string;
}

export interface ChatConversationPreview {
    inbox_id: number;
    telefono: string;
    nombre_whatsapp: string | null;
    estado: string;
    modo: 'BOT' | 'ASESOR';
    ultimo_mensaje_at: string | null;
    mensajes_no_leidos: number;
    ultimo_mensaje_preview: string | null;
    asignado_a: number | null;
}

export interface SendMessageRequest {
    contenido: string;
}

export interface ChangeEstadoRequest {
    nuevo_estado: string;
}
