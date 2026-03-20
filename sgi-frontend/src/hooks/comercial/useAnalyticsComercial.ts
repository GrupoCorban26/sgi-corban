import { useQuery } from '@tanstack/react-query';
import { analyticsComercialService } from '@/services/comercial/analytics-comercial';

export const useRadarComercial = (periodo: string) => {
  return useQuery({
    queryKey: ['analytics-radar', periodo],
    queryFn: () => analyticsComercialService.obtenerRadar(periodo),
    staleTime: 1000 * 60 * 5,
    enabled: !!periodo,
  });
};

export const useEmbudoComercial = (periodo: string) => {
  return useQuery({
    queryKey: ['analytics-embudo', periodo],
    queryFn: () => analyticsComercialService.obtenerEmbudo(periodo),
    staleTime: 1000 * 60 * 5,
    enabled: !!periodo,
  });
};
