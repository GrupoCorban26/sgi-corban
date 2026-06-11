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

export const useAnalyticsCotizaciones = (fechaInicio: string, fechaFin: string, clienteId?: number | null, empresaId?: number | null) => {
  return useQuery({
    queryKey: ['analytics-cotizaciones', fechaInicio, fechaFin, clienteId, empresaId],
    queryFn: () => analyticsComercialService.obtenerCotizaciones(fechaInicio, fechaFin, clienteId, empresaId),
    staleTime: 1000 * 60 * 5,
    enabled: !!fechaInicio && !!fechaFin,
  });
};

export const useEmpresasGrupo = () => {
  return useQuery({
    queryKey: ['empresas-grupo'],
    queryFn: () => analyticsComercialService.obtenerEmpresasGrupo(),
    staleTime: 1000 * 60 * 60, // 1 hora
  });
};
