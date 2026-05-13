import api from '@/lib/axios';
import { DashboardAnalytics } from '@/types/analytics';

export const analyticsService = {
    getDashboard: async (fechaInicio: string, fechaFin: string): Promise<DashboardAnalytics> => {
        const response = await api.get('/clientes/metricas/dashboard', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            }
        });
        return response.data;
    },
    getBaseDatos: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<DashboardAnalytics['base_datos']> => {
        const response = await api.get('/clientes/metricas/dashboard/base-datos', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    },
    getCartera: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<DashboardAnalytics['cartera']> => {
        const response = await api.get('/clientes/metricas/dashboard/cartera', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    },
    getBuzon: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<DashboardAnalytics['buzon']> => {
        const response = await api.get('/clientes/metricas/dashboard/buzon', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    },
    getDetalleBuzon: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<{
        telefono: string; nombre: string; estado: string; estado_raw: string; tipo_interes: string;
        origen: string; motivo_descarte: string; comentario_descarte: string;
        fecha_recepcion: string; fecha_gestion: string; fecha_cierre: string; comercial: string;
    }[]> => {
        const response = await api.get('/clientes/metricas/dashboard/buzon/detalle', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    },
    getDetalleBaseDatos: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<Record<string, string>[]> => {
        const response = await api.get('/clientes/metricas/dashboard/base-datos/detalle', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    },
    getDetalleCartera: async (fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string): Promise<Record<string, string>[]> => {
        const response = await api.get('/clientes/metricas/dashboard/cartera/detalle', {
            params: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                comercial_id: comercialId || undefined,
                empresa: empresa || undefined
            }
        });
        return response.data;
    }
};
