/**
 * Servicio de Importaciones - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import { ImportacionResponse } from '@/types/importaciones';

export const importacionesService = {
    getImportaciones: async (
        page: number,
        pageSize: number,
        search?: string,
        sinTelefono?: boolean,
        sortByRuc?: string
    ): Promise<ImportacionResponse> => {
        const params: Record<string, unknown> = { page, page_size: pageSize };
        if (search) params.search = search;
        if (sinTelefono) params.sin_telefono = true;
        if (sortByRuc) params.sort_by_ruc = sortByRuc;

        const { data } = await api.get('/importaciones/', { params });
        return data;
    },

    uploadImportaciones: async (file: File): Promise<{ success: boolean; message: string; records_count: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/importaciones/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    }
};
