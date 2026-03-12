// =============================================
// Tipos para Analytics del Buzón (WhatsApp + Web)
// =============================================

export interface ItemConteo {
    name: string;
    value: number;
}

export interface LeadsPorComercial {
    nombre: string;
    total: number;
    convertidos: number;
    descartados: number;
    tasa_conversion: number;
}

export interface TendenciaMensual {
    mes: string;
    whatsapp: number;
    web: number;
    total: number;
}

// Nivel 1 — Vista General
export interface ResumenGeneral {
    total_leads: number;
    total_convertidos: number;
    total_descartados: number;
    total_en_gestion: number;
    tasa_conversion: number;
    tasa_descarte: number;
    tiempo_respuesta_promedio_minutos: number | null;
    proporcion_canal: ItemConteo[];
    tendencia_mensual: TendenciaMensual[];
}

// Nivel 2 — Por Canal
export interface ResumenCanalWhatsApp {
    total: number;
    nuevos: number;
    pendientes: number;
    en_gestion: number;
    cotizados: number;
    cierre: number;
    descartados: number;
    tasa_conversion: number;
    tasa_descarte: number;
    tiempo_respuesta_promedio_minutos: number | null;
    motivos_descarte: ItemConteo[];
    leads_por_comercial: LeadsPorComercial[];
}

export interface ResumenCanalWeb {
    total: number;
    nuevos: number;
    pendientes: number;
    en_gestion: number;
    convertidos: number;
    descartados: number;
    tasa_conversion: number;
    tasa_descarte: number;
    tiempo_respuesta_promedio_minutos: number | null;
    motivos_descarte: ItemConteo[];
    leads_por_pagina: ItemConteo[];
    leads_por_comercial: LeadsPorComercial[];
}

export interface AnalyticsPorCanal {
    whatsapp: ResumenCanalWhatsApp;
    web: ResumenCanalWeb;
}

// Nivel 3 — Comparativo
export interface ComparativoItem {
    metrica: string;
    whatsapp: number;
    web: number;
}

export interface RendimientoComercialComparativo {
    nombre: string;
    whatsapp: number;
    web: number;
    total: number;
}

export interface AnalyticsComparativo {
    metricas: ComparativoItem[];
    rendimiento_por_comercial: RendimientoComercialComparativo[];
}

// Response completo
export interface AnalyticsBuzonResponse {
    general: ResumenGeneral;
    por_canal: AnalyticsPorCanal;
    comparativo: AnalyticsComparativo;
}

// Filtros para el request
export interface AnalyticsBuzonFiltros {
    fecha_desde?: string;
    fecha_hasta?: string;
}
