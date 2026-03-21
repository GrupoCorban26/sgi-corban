import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface EquipoDisponibilidad {
    usuario_id: number;
    nombre: string;
    disponible_buzon: boolean;
}

interface ToggleResponse {
    success: number;
    usuario_id: number;
    disponible_buzon: boolean;
    message: string;
}

const BASE_URL = '/usuarios/disponibilidad-buzon';

/**
 * Hook para que SISTEMAS y JEFE_COMERCIAL gestionen
 * la disponibilidad del equipo comercial.
 */
export const useEquipoDisponibilidad = (enabled: boolean) => {
    const queryClient = useQueryClient();

    const query = useQuery<EquipoDisponibilidad[]>({
        queryKey: ['equipo-disponibilidad'],
        queryFn: async () => {
            const { data } = await api.get<EquipoDisponibilidad[]>(`${BASE_URL}/equipo`);
            return data;
        },
        enabled,
        refetchInterval: 30_000,
    });

    const toggleMutation = useMutation<ToggleResponse, Error, number>({
        mutationFn: async (userId: number) => {
            const { data } = await api.patch<ToggleResponse>(
                `${BASE_URL}/${userId}/toggle`
            );
            return data;
        },
        onMutate: async (userId) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['equipo-disponibilidad'] });
            const previous = queryClient.getQueryData<EquipoDisponibilidad[]>(['equipo-disponibilidad']);

            queryClient.setQueryData<EquipoDisponibilidad[]>(
                ['equipo-disponibilidad'],
                (old) =>
                    old?.map((u) =>
                        u.usuario_id === userId
                            ? { ...u, disponible_buzon: !u.disponible_buzon }
                            : u
                    ) ?? []
            );

            return { previous };
        },
        onError: (_err, _userId, context) => {
            // Rollback on error
            if ((context as { previous?: EquipoDisponibilidad[] })?.previous) {
                queryClient.setQueryData(
                    ['equipo-disponibilidad'],
                    (context as { previous: EquipoDisponibilidad[] }).previous
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['equipo-disponibilidad'] });
        },
    });

    return {
        equipo: query.data ?? [],
        isLoading: query.isLoading,
        toggleUsuario: toggleMutation.mutate,
        isToggling: toggleMutation.isPending,
    };
};
