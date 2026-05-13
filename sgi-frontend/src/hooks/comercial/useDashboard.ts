import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/comercial/dashboard';

export function useDashboard(params: {
    fecha_inicio: string;
    fecha_fin: string;
    comparar?: boolean;
    comercial_id?: number;
    empresa?: string;
}) {
    return useQuery({
        queryKey: ['dashboard-reportes', params],
        queryFn: () => dashboardService.getDashboard(params),
        enabled: !!params.fecha_inicio && !!params.fecha_fin,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}
