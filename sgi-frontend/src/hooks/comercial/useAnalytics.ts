import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/comercial/analytics';

export function useAnalytics(fechaInicio: string, fechaFin: string) {
    return useQuery({
        queryKey: ['analytics', fechaInicio, fechaFin],
        queryFn: () => analyticsService.getDashboard(fechaInicio, fechaFin),
        enabled: !!fechaInicio && !!fechaFin,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
}
