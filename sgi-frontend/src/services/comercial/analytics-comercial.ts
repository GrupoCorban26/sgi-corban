import api from '@/lib/axios';
import { RadarResponse, EmbudoResponse } from '@/types/analytics-comercial';

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
};
