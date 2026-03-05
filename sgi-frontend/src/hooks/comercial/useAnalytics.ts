import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/comercial/analytics';

export function useAnalytics(fechaInicio: string, fechaFin: string) {
    return useQuery({
        queryKey: ['analytics', fechaInicio, fechaFin],
        queryFn: () => analyticsService.getDashboard(fechaInicio, fechaFin),
        enabled: !!fechaInicio && !!fechaFin,
        staleTime: 60 * 1000, // 1 minuto
        refetchInterval: 60 * 1000, // Auto-refrescar cada 1 minuto
    });
}
