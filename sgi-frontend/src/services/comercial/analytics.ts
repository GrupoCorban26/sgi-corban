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
    }
};
