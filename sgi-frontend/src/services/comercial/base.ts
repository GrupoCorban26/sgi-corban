/**
 * Servicio de Base - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import { BaseResponse } from '@/types/base';

export const baseService = {
    getBase: async (page: number, pageSize: number, search?: string): Promise<BaseResponse> => {
        const params: Record<string, unknown> = { page, page_size: pageSize };
        if (search) params.search = search;

        const { data } = await api.get('/base/', { params });
        return data;
    },

    getStats: async () => {
        const { data } = await api.get('/base/stats');
        return data;
    }
};
