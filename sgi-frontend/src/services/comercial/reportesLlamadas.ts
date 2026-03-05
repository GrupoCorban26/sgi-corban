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

    exportarExcel: async (params: { fecha_inicio: string; fecha_fin: string; comercial_id?: number }) => {
        const response = await api.get('/comercial/reportes/llamadas/exportar', {
            params,
            responseType: 'blob' // Importante para recibir archivos binarios
        });

        // Crear un objeto URL para el blob y forzar la descarga
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Extraer nombre del archivo desde los headers si es posible, sino usar default
        let filename = `Reporte_Llamadas.xlsx`;
        const disposition = response.headers['content-disposition'];
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    getBotAnalytics: async (params: { fecha_inicio: string; fecha_fin: string }) => {
        const { data } = await api.get('/comercial/reportes/bot-analytics', { params });
        return data as {
            por_tipo_interes: { tipo: string; total: number }[];
            por_hora: { hora: number; total: number }[];
            motivos_descarte: { motivo: string; total: number }[];
            por_dia: { fecha: string; total: number }[];
        };
    }
};
