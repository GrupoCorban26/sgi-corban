import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/comercial/analytics';

export function useAnalyticsBaseDatos(fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string) {
    return useQuery({
        queryKey: ['analytics-base-datos', fechaInicio, fechaFin, comercialId, empresa],
        queryFn: () => analyticsService.getBaseDatos(fechaInicio, fechaFin, comercialId, empresa),
        enabled: !!fechaInicio && !!fechaFin,
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });
}

export function useAnalyticsCartera(fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string) {
    return useQuery({
        queryKey: ['analytics-cartera', fechaInicio, fechaFin, comercialId, empresa],
        queryFn: () => analyticsService.getCartera(fechaInicio, fechaFin, comercialId, empresa),
        enabled: !!fechaInicio && !!fechaFin,
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });
}

export function useAnalyticsBuzon(fechaInicio: string, fechaFin: string, comercialId?: string, empresa?: string) {
    return useQuery({
        queryKey: ['analytics-buzon', fechaInicio, fechaFin, comercialId, empresa],
        queryFn: () => analyticsService.getBuzon(fechaInicio, fechaFin, comercialId, empresa),
        enabled: !!fechaInicio && !!fechaFin,
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });
}
