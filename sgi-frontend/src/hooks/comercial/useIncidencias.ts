import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    Incidencia,
    IncidenciaCreate,
    IncidenciaUpdate,
    IncidenciaResolver
} from '@/types/seguimiento';

const INCIDENCIAS_URL = '/incidencias';

export const useIncidencias = (estado: string | null = null) => {
    const queryClient = useQueryClient();

    // 1. Listar todas las incidencias
    const listQuery = useQuery({
        queryKey: ['incidencias', estado],
        queryFn: async () => {
            const params: Record<string, unknown> = {};
            if (estado) params.estado = estado;
            const { data } = await api.get<Incidencia[]>(`${INCIDENCIAS_URL}`, { params });
            return data;
        }
    });

    // 2. Crear incidencia
    const createMutation = useMutation({
        mutationFn: async (newInc: IncidenciaCreate) => {
            const { data } = await api.post<Incidencia>(`${INCIDENCIAS_URL}`, newInc);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidencias'] });
        }
    });

    // 3. Editar incidencia
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: IncidenciaUpdate }) => {
            const { data: response } = await api.put<Incidencia>(`${INCIDENCIAS_URL}/${id}`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidencias'] });
            queryClient.invalidateQueries({ queryKey: ['incidencia', variables.id] });
        }
    });

    // 4. Resolver incidencia
    const resolverMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: IncidenciaResolver }) => {
            const { data: response } = await api.post<Incidencia>(`${INCIDENCIAS_URL}/${id}/resolver`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidencias'] });
            queryClient.invalidateQueries({ queryKey: ['incidencia', variables.id] });
        }
    });

    // 5. Eliminar (soft delete)
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`${INCIDENCIAS_URL}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidencias'] });
        }
    });

    return {
        listQuery,
        incidencias: listQuery.data || [],
        isLoading: listQuery.isLoading,
        isError: listQuery.isError,
        createMutation,
        updateMutation,
        resolverMutation,
        deleteMutation
    };
};

export const useIncidenciaDetalle = (id: number | null) => {
    return useQuery({
        queryKey: ['incidencia', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<Incidencia>(`${INCIDENCIAS_URL}/${id}`);
            return data;
        },
        enabled: !!id
    });
};
