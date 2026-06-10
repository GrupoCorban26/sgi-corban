export interface TipoCarga {
    id: number;
    nombre: string;
    orden: number;
    is_active: boolean;
}

export interface TipoServicioComercial {
    id: number;
    nombre: string;
    orden: number;
    is_active: boolean;
}

export interface SegmentacionCierre {
    id: number;
    nombre: string;
    orden: number;
    is_active: boolean;
}

export interface CotizacionItem {
    id: number;
    seguimiento_id: number;
    tipo_carga_id: number;
    tipo_servicio_id: number;
    tipo_operacion: string | null;  // IMPORTACION | EXPORTACION
    pais_origen: string | null;
    incoterm: string | null;
    estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'DESCARTADO';
    codigo_operacion: string | null;
    segmentacion_id: number | null;
    segmentacion_nombre: string | null;
    fecha_cierre: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    tipo_carga_nombre: string | null;
    tipo_servicio_nombre: string | null;
}

export interface CotizacionItemCreate {
    tipo_carga_id: number;
    tipo_servicio_id: number;
    tipo_operacion?: string | null;
    pais_origen?: string | null;
    incoterm?: string | null;
}

export interface DocumentoOperacional {
    id: number;
    nombre: string;
    descripcion: string | null;
    is_active: boolean;
}

export interface SeguimientoDocumento {
    id: number;
    documento_id: number;
    documento_nombre: string | null;
    completado: boolean;
    fecha_recepcion: string | null;
    registrado_por: number | null;
}

export interface Seguimiento {
    id: number;
    cliente_id: number | null;
    cliente_razon_social: string | null;
    cliente_ruc: string | null;
    comercial_id: number;
    comercial_nombre: string | null;
    titulo: string;
    estado: 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO';
    motivo_caida: string | null;
    fecha_eta: string | null;
    contacto_alerta_id: number | null;
    documentos: SeguimientoDocumento[];
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    created_by: number | null;
    updated_by: number | null;
    cotizaciones: CotizacionItem[];
    // Campos temporales para prospectos sin cliente formal
    temp_cliente_nombre: string | null;
    temp_cliente_ruc: string | null;
    temp_cliente_contacto: string | null;
    temp_cliente_correo: string | null;
    temp_cliente_telefono: string | null;
}

export interface SeguimientoCreate {
    cliente_id?: number | null;
    titulo: string;
    items: CotizacionItemCreate[];
    comentario_inicial?: string | null;
    estado_inicial?: 'SOLICITUD' | 'COTIZADO';
    temp_cliente_nombre?: string | null;
    temp_cliente_ruc?: string | null;
    temp_cliente_contacto?: string | null;
    temp_cliente_correo?: string | null;
    temp_cliente_telefono?: string | null;
}

export interface SeguimientoUpdate {
    cliente_id?: number | null;
    titulo?: string;
    fecha_eta?: string | null;
    contacto_alerta_id?: number | null;
    temp_cliente_nombre?: string | null;
    temp_cliente_ruc?: string | null;
    temp_cliente_contacto?: string | null;
    temp_cliente_correo?: string | null;
    temp_cliente_telefono?: string | null;
}

export interface ClienteRegistroFaseCierre {
    ruc: string;
    razon_social: string;
    direccion_fiscal: string;
    distrito_id: number;
    origen_id: number;
}

export interface CotizacionCerrar {
    cotizacion_id: number;
    codigo_operacion: string;
    segmentacion_id: number;
    medio_gestion_id: number;
    comentario?: string | null;
    cliente_registro?: ClienteRegistroFaseCierre | null;
    fecha_cambio?: string;
}

export interface SeguimientoCaer {
    motivo_caida: string;
    medio_gestion_id: number;
    comentario?: string | null;
    fecha_cambio?: string;
}

export interface SeguimientoMover {
    estado_nuevo: 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO';
    medio_gestion_id: number;
    comentario?: string | null;
    fecha_cambio?: string;
}

export interface SeguimientoOperar {
    fecha_eta: string;
    incoterm: string;
    documento_ids: number[];
    contacto_alerta_id: number;
    medio_gestion_id: number;
    comentario?: string;
    fecha_cambio?: string;
}

export interface DocumentoToggle {
    completado: boolean;
}

export interface SeguimientoEntregar {
    medio_gestion_id: number;
    comentario?: string;
    fecha_cambio?: string;
}

export interface SeguimientoComentario {
    id: number;
    seguimiento_id: number;
    comentario: string;
    medio_gestion_id: number | null;
    medio_gestion_nombre: string | null;
    created_at: string;
    created_by: number | null;
    creador_nombre: string | null;
}

export interface SeguimientoHistorial {
    id: number;
    seguimiento_id: number;
    estado_anterior: string | null;
    estado_nuevo: string;
    comentario: string | null;
    tiempo_en_estado_anterior: number | null;
    fecha_cambio: string;
    registrado_por: number | null;
    usuario_nombre: string | null;
}

export interface SeguimientoCatalogos {
    tipos_carga: TipoCarga[];
    tipos_servicio: TipoServicioComercial[];
    segmentaciones_cierre: SegmentacionCierre[];
    medios_gestion: { id: number; nombre: string; is_active: boolean }[];
    documentos_operacionales: DocumentoOperacional[];
}

// --- Incidencias ---

export interface Incidencia {
    id: number;
    seguimiento_id: number | null;
    cliente_id: number;
    comercial_id: number;
    codigo_operacion: string | null;
    descripcion: string;
    observacion: string | null;
    estado: 'ABIERTA' | 'EN_INVESTIGACION' | 'RESUELTA';
    resolucion: string | null;
    fecha_resolucion: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    created_by: number | null;
    updated_by: number | null;
    comercial_nombre: string | null;
    cliente_razon_social: string | null;
}

export interface IncidenciaCreate {
    seguimiento_id?: number | null;
    cliente_id: number;
    codigo_operacion?: string | null;
    descripcion: string;
    observacion?: string | null;
}

export interface IncidenciaUpdate {
    descripcion?: string;
    observacion?: string | null;
    estado?: 'ABIERTA' | 'EN_INVESTIGACION' | 'RESUELTA';
    resolucion?: string | null;
    fecha_resolucion?: string | null;
}

export interface IncidenciaResolver {
    resolucion: string;
    fecha_resolucion?: string | null;
}
