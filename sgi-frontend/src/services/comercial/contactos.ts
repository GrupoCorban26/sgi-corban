/**
 * Servicio de Contactos - CRUD de directorio CRM (ClienteContacto)
 * Usa interceptores para inyección automática de token
 * 
 * NOTA: La carga masiva de contactos de prospección ahora se hace
 * a través de lotesService (POST /lotes/upload).
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

    assignBatch: async (): Promise<Contacto[]> => {
        const { data } = await api.post('/contactos/assign-batch');
        return data;
    },

    assignManual: async (ruc: string, comercial_id: number): Promise<{ success: boolean; message: string }> => {
        const { data } = await api.post(`/contactos/asignar-manual/${ruc}`, { comercial_id });
        return data;
    },
};
