import api from '@/lib/axios';
import { ReporteLlamadaPaginated } from '@/types/reportesLlamadas';

export const reportesLlamadasService = {
    getHistorial: async (params: {
        fecha_inicio: string;
        fecha_fin: string;
        comercial_id?: number;
        page?: number;
        page_size?: number;
    }) => {
        const { data } = await api.get<ReporteLlamadaPaginated>('/comercial/reportes/llamadas', { params });
        return data;
    },

    exportarUrl: (params: { fecha_inicio: string; fecha_fin: string; comercial_id?: number }) => {
        // Generar la URL de descarga para ser usada en un <a> o windows.open()
        const query = new URLSearchParams();
        query.append('fecha_inicio', params.fecha_inicio);
        query.append('fecha_fin', params.fecha_fin);
        if (params.comercial_id) query.append('comercial_id', params.comercial_id.toString());

        return `/api/v1/comercial/reportes/llamadas/exportar?${query.toString()}`;
    }
};
