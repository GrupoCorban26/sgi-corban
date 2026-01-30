import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

interface AreaOption {
    id: number;
    nombre: string;
}

export const useAreas = () => {
    return useQuery({
        queryKey: ['areas-dropdown'],
        queryFn: async () => {
            const { data } = await api.get<AreaOption[]>('/areas/dropdown');
            return data;
        },
        staleTime: 1000 * 60 * 60, // 1 hora
    });
};
