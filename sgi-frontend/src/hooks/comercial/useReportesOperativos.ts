import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

// ============================================
// TYPES
// ============================================

export interface DetalleBaseDatos {
    id: number;
    razon_social: string;
    ruc: string | null;
    estado: string;
    origen: string | null;
    fecha_ingreso: string;
    ultimo_contacto: string | null;
    comercial_nombre: string | null;
}

export interface ReporteBaseDatosResponse {
    kpis: {
        total_leads_ingresados: number;
        leads_contactados: number;
        porcentaje_contactabilidad: number;
        leads_convertidos: number;
        porcentaje_conversion: number;
    };
    detalle: DetalleBaseDatos[];
}

export interface DetalleMantenimientoCartera {
    id: number;
    razon_social: string;
    estado: string;
    ultimo_contacto: string | null;
    proxima_fecha_contacto: string | null;
    dias_sin_contacto: number;
    comercial_nombre: string | null;
}

export interface ReporteMantenimientoCarteraResponse {
    kpis: {
        clientes_activos: number;
        clientes_recontactados: number;
        porcentaje_cobertura: number;
        clientes_en_riesgo: number;
        porcentaje_riesgo: number;
    };
    detalle: DetalleMantenimientoCartera[];
}

export interface DetalleGestionLeads {
    id: number;
    fuente: string;
    nombre: string;
    estado: string;
    fecha_recepcion: string;
    tiempo_respuesta_minutos: number | null;
    comercial_nombre: string | null;
}

export interface ReporteGestionLeadsResponse {
    kpis: {
        leads_recibidos: number;
        leads_atendidos: number;
        porcentaje_atencion: number;
        tiempo_promedio_respuesta_minutos: number;
        leads_descartados: number;
    };
    detalle: DetalleGestionLeads[];
}

// ============================================
// HOOKS
// ============================================

const BASE_URL = '/comercial/reportes';

export function useReporteBaseDatos(periodo: string, comercialId?: number) {
    const params = new URLSearchParams({ periodo });
    if (comercialId) params.append('comercial_id', String(comercialId));

    return useQuery<ReporteBaseDatosResponse>({
        queryKey: ['reporte-base-datos', periodo, comercialId],
        queryFn: async () => {
            const { data } = await api.get(`${BASE_URL}/base-datos?${params.toString()}`);
            return data;
        },
        enabled: !!periodo,
    });
}

export function useReporteMantenimientoCartera(periodo: string, comercialId?: number) {
    const params = new URLSearchParams({ periodo });
    if (comercialId) params.append('comercial_id', String(comercialId));

    return useQuery<ReporteMantenimientoCarteraResponse>({
        queryKey: ['reporte-mantenimiento-cartera', periodo, comercialId],
        queryFn: async () => {
            const { data } = await api.get(`${BASE_URL}/mantenimiento-cartera?${params.toString()}`);
            return data;
        },
        enabled: !!periodo,
    });
}

export function useReporteGestionLeads(periodo: string, comercialId?: number) {
    const params = new URLSearchParams({ periodo });
    if (comercialId) params.append('comercial_id', String(comercialId));

    return useQuery<ReporteGestionLeadsResponse>({
        queryKey: ['reporte-gestion-leads', periodo, comercialId],
        queryFn: async () => {
            const { data } = await api.get(`${BASE_URL}/gestion-leads?${params.toString()}`);
            return data;
        },
        enabled: !!periodo,
    });
}
