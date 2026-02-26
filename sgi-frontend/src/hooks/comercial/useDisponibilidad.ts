import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

const URL = '/usuarios/disponibilidad-buzon';

/**
 * Hook para gestionar la disponibilidad del buzón del comercial.
 * - useDisponibilidadQuery: consulta el estado actual
 * - useToggleDisponibilidad: alterna el estado (disponible/no disponible)
 */
export const useDisponibilidadBuzon = () => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['disponibilidad-buzon'],
        queryFn: async () => {
            const { data } = await api.get<{ disponible_buzon: boolean }>(`${URL}/estado`);
            return data.disponible_buzon;
        },
        refetchInterval: 30000, // Cada 30s (por si el scheduler lo resetea)
    });

    const toggleMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.patch<{ disponible_buzon: boolean; message: string }>(
                `${URL}/toggle`
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['disponibilidad-buzon'], data.disponible_buzon);
        },
    });

    return {
        disponible: query.data ?? true,
        isLoading: query.isLoading,
        toggle: toggleMutation.mutate,
        isToggling: toggleMutation.isPending,
    };
};
