import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ComercialOption {
    id: number;
    nombre: string;
}

// Hook para obtener comerciales (usuarios con rol COMERCIAL)
export const useComerciales = () => {
    return useQuery({
        queryKey: ['comerciales-dropdown'],
        queryFn: async () => {
            const { data } = await api.get<ComercialOption[]>('/usuarios/comerciales/dropdown');
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
};
