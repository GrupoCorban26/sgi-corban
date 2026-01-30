/**
 * Servicio de Casos de Llamada - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import { CasoLlamada, CasoLlamadaCreate, CasoLlamadaUpdate } from '@/types/casos-llamada';

export const casosLlamadaService = {
    getAll: async (): Promise<CasoLlamada[]> => {
        const { data } = await api.get('/casos-llamada/');
        return data;
    },

    getById: async (id: number): Promise<CasoLlamada> => {
        const { data } = await api.get(`/casos-llamada/${id}`);
        return data;
    },

    create: async (caso: CasoLlamadaCreate): Promise<{ id: number }> => {
        const { data } = await api.post('/casos-llamada/', caso);
        return data;
    },

    update: async (id: number, caso: CasoLlamadaUpdate): Promise<boolean> => {
        const { data } = await api.put(`/casos-llamada/${id}`, caso);
        return data;
    },

    delete: async (id: number): Promise<boolean> => {
        const { data } = await api.delete(`/casos-llamada/${id}`);
        return data;
    }
};
