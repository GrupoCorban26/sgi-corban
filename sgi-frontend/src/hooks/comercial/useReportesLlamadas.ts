import { useQuery } from '@tanstack/react-query';
import { reportesLlamadasService } from '@/services/comercial/reportesLlamadas';

export const useReportesLlamadas = (params: {
    fecha_inicio: string;
    fecha_fin: string;
    comercial_id?: number;
    page: number;
    page_size: number;
}) => {
    return useQuery({
        queryKey: ['reportesLlamadas', params],
        queryFn: () => reportesLlamadasService.getHistorial({
            ...params,
            comercial_id: params.comercial_id === 0 ? undefined : params.comercial_id
        }),
        enabled: !!params.fecha_inicio && !!params.fecha_fin,
        placeholderData: (previousData) => previousData, // keep previous data while fetching
    });
};
