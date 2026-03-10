import api from '@/lib/axios';
import { LeadWeb, LeadWebFiltros, LeadWebDescartarRequest, LeadWebConvertirRequest } from '@/types/lead-web';

const BASE_URL = '/comercial/leads-web';

export const leadsWebService = {
    listar: async (filtros?: LeadWebFiltros): Promise<LeadWeb[]> => {
        const params: Record<string, any> = {};
        if (filtros?.estado) params.estado = filtros.estado;
        if (filtros?.pagina_origen) params.pagina_origen = filtros.pagina_origen;
        if (filtros?.filtro_comercial_id) params.filtro_comercial_id = filtros.filtro_comercial_id;
        const { data } = await api.get<LeadWeb[]>(BASE_URL, { params });
        return data;
    },

    obtener: async (id: number): Promise<LeadWeb> => {
        const { data } = await api.get<LeadWeb>(`${BASE_URL}/${id}`);
        return data;
    },

    contarPendientes: async (): Promise<number> => {
        const { data } = await api.get<number>(`${BASE_URL}/count`);
        return data;
    },

    cambiarEstado: async (id: number, estado: string, notas?: string): Promise<void> => {
        await api.patch(`${BASE_URL}/${id}/estado`, { estado, notas });
    },

    descartar: async (id: number, request: LeadWebDescartarRequest): Promise<void> => {
        await api.post(`${BASE_URL}/${id}/descartar`, request);
    },

    convertir: async (id: number, request: LeadWebConvertirRequest): Promise<any> => {
        const { data } = await api.post(`${BASE_URL}/${id}/convertir`, request);
        return data;
    },

    actualizarNotas: async (id: number, notas: string): Promise<void> => {
        await api.patch(`${BASE_URL}/${id}/notas`, { notas });
    },

    asignarManual: async (id: number, comercialId: number): Promise<any> => {
        const { data } = await api.post(`${BASE_URL}/${id}/asignar`, null, {
            params: { comercial_id: comercialId }
        });
        return data;
    },
};
