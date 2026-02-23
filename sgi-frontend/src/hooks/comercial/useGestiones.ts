import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// Tipos
export interface Gestion {
    id: number;
    cliente_id: number;
    comercial_id: number;
    comercial_nombre: string | null;
    tipo: string;
    resultado: string;
    comentario: string | null;
    proxima_fecha_contacto: string | null;
    created_at: string;
}

export interface GestionCreate {
    tipo: string;
    resultado: string;
    comentario?: string;
    proxima_fecha_contacto?: string;
}

// ============================================
// HOOK DE GESTIONES
// ============================================
export const useGestiones = (clienteId: number | null) => {
    const queryClient = useQueryClient();

    // 1. Listar gestiones de un cliente
    const listQuery = useQuery({
        queryKey: ['gestiones', clienteId],
        queryFn: async () => {
            if (!clienteId) return [];
            const { data } = await api.get<Gestion[]>(`/clientes/${clienteId}/gestiones`);
            return data;
        },
        enabled: !!clienteId,
    });

    // 2. Registrar nueva gestión
    const registrarMutation = useMutation({
        mutationFn: async ({ clienteId, gestion }: { clienteId: number; gestion: GestionCreate }) => {
            const { data } = await api.post(`/clientes/${clienteId}/gestiones`, gestion);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gestiones', clienteId] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    return {
        gestiones: listQuery.data || [],
        isLoading: listQuery.isLoading,
        isError: listQuery.isError,
        refetch: listQuery.refetch,
        registrarMutation,
    };
};
