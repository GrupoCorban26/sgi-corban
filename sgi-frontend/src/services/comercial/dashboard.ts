import api from '@/lib/axios';
import { DashboardData } from '@/types/dashboard';

export const dashboardService = {
    getDashboard: async (params: {
        fecha_inicio: string;
        fecha_fin: string;
        comparar?: boolean;
        comercial_id?: number;
        empresa?: string;
    }): Promise<DashboardData> => {
        const { data } = await api.get<DashboardData>('/comercial/reportes/dashboard', { params });
        return data;
    },
};
