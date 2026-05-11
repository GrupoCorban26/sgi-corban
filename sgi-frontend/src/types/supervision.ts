// Tipos para el módulo de Supervisión WhatsApp (Evolution API v2)

export interface EvoInstancia {
    id: number;
    instance_name: string;
    instance_id: string | null;
    usuario_id: number;
    nombre_comercial: string | null;
    telefono: string | null;
    estado: 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO';
    profile_name: string | null;
    profile_pic_url: string | null;
    last_seen: string | null;
    created_at: string | null;
    total_conversaciones: number;
    total_mensajes: number;
}

export interface EvoInstanciaQR {
    instance_name: string;
    estado: string;
    qr_code: string | null;
    message: string | null;
}

export interface EvoConversacion {
    id: number;
    instancia_id: number;
    remote_jid: string;
    nombre_contacto: string | null;
    es_grupo: boolean;
    ultimo_mensaje: string | null;
    ultimo_mensaje_at: string | null;
    mensajes_no_leidos: number;
}

export interface EvoConversacionList {
    items: EvoConversacion[];
    total: number;
}

export interface EvoMensaje {
    id: number;
    message_id: string;
    from_me: boolean;
    tipo: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'reaction' | string;
    contenido: string | null;
    media_url: string | null;
    media_mimetype: string | null;
    timestamp: string;
    participant?: string | null;
    participant_name?: string | null;
    reaccion?: string | null;
}

export interface EvoMensajeList {
    items: EvoMensaje[];
    total: number;
}

export interface ComercialInfo {
    usuario_id: number;
    nombre_completo: string;
    empresa: string;
    tiene_instancia: boolean;
    instancia_id: number | null;
    estado_instancia: 'CONECTADO' | 'CONECTANDO' | 'DESCONECTADO' | null;
    telefono: string | null;
    total_conversaciones: number;
}
