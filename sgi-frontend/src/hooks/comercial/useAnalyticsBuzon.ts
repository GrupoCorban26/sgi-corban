import { useQuery } from '@tanstack/react-query';
import { leadsWebService } from '@/services/comercial/leads-web';
import { AnalyticsBuzonFiltros } from '@/types/analytics-buzon';

const QUERY_KEY = 'analytics-buzon';

export const useAnalyticsBuzon = (filtros?: AnalyticsBuzonFiltros) => {
    const analyticsQuery = useQuery({
        queryKey: [QUERY_KEY, filtros],
        queryFn: () => leadsWebService.obtenerAnalyticsBuzon(filtros),
        staleTime: 1000 * 60 * 5, // 5 min cache — analytics no cambian segundo a segundo
    });

    return {
        data: analyticsQuery.data,
        isLoading: analyticsQuery.isLoading,
        isError: analyticsQuery.isError,
        refetch: analyticsQuery.refetch,
    };
};
