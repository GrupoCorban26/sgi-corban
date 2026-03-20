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
    }
};
