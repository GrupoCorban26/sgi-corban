import api from '@/lib/axios';
import { 
  RadarResponse, 
  EmbudoResponse,
  CotizacionesAnalyticsResponse
} from '@/types/analytics-comercial';

const BASE_URL = '/comercial/analytics';

export const analyticsComercialService = {
  obtenerRadar: async (periodo: string): Promise<RadarResponse> => {
    const { data } = await api.get<RadarResponse>(`${BASE_URL}/radar`, {
      params: { periodo },
    });
    return data;
  },

  obtenerEmbudo: async (periodo: string): Promise<EmbudoResponse> => {
    const { data } = await api.get<EmbudoResponse>(`${BASE_URL}/embudo`, {
      params: { periodo },
    });
    return data;
  },

  obtenerCotizaciones: async (fechaInicio: string, fechaFin: string, clienteId?: number | null): Promise<CotizacionesAnalyticsResponse> => {
    const params: Record<string, any> = { 
      fecha_inicio: fechaInicio, 
      fecha_fin: fechaFin 
    };
    if (clienteId) {
      params.cliente_id = clienteId;
    }
    const { data } = await api.get<CotizacionesAnalyticsResponse>(`${BASE_URL}/cotizaciones/resumen`, {
      params,
    });
    return data;
  },

  exportarCotizacionesExcel: async (fechaInicio: string, fechaFin: string, clienteId?: number | null): Promise<Blob> => {
    const params: Record<string, any> = { 
      fecha_inicio: fechaInicio, 
      fecha_fin: fechaFin 
    };
    if (clienteId) {
      params.cliente_id = clienteId;
    }
    const { data } = await api.get<Blob>(`${BASE_URL}/cotizaciones/exportar`, {
      params,
      responseType: 'blob'
    });
    return data;
  }
};
