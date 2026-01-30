/**
 * Servicio de Contactos - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import { Contacto, ContactosListResponse, KpisGestion } from '@/types/contactos';

export const contactosService = {
    getByRuc: async (ruc: string): Promise<Contacto[]> => {
        const { data } = await api.get(`/contactos/ruc/${ruc}`);
        return data;
    },

    getPaginated: async (
        page: number = 1,
        pageSize: number = 20,
        search?: string,
        estado?: string
    ): Promise<ContactosListResponse> => {
        const params: Record<string, unknown> = { page, page_size: pageSize };
        if (search) params.search = search;
        if (estado) params.estado = estado;

        const { data } = await api.get('/contactos/list/paginated', { params });
        return data;
    },

    getStats: async () => {
        const { data } = await api.get('/contactos/stats');
        return data;
    },

    getKpisGestion: async (params?: { fecha_inicio?: string; fecha_fin?: string }): Promise<KpisGestion> => {
        const { data } = await api.get<KpisGestion>('/contactos/kpis-gestion', { params });
        return data;
    },

    create: async (contacto: Omit<Contacto, 'id'>): Promise<boolean> => {
        const { data } = await api.post('/contactos/', contacto);
        return data;
    },

    update: async (id: number, contacto: Partial<Contacto>): Promise<boolean> => {
        const { data } = await api.put(`/contactos/${id}`, contacto);
        return data;
    },

    delete: async (id: number): Promise<boolean> => {
        const { data } = await api.delete(`/contactos/${id}`);
        return data;
    },

    upload: async (file: File): Promise<{ message: string; inserted: number; updated: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/contactos/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    },

    assignBatch: async (): Promise<Contacto[]> => {
        const { data } = await api.post('/contactos/assign-batch');
        return data;
    }
};
