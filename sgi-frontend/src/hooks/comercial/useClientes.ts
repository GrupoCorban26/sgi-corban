import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    ClientePaginationResponse,
    ClienteOperationResult,
    ClienteStats,
    ClienteCreate,
    ClienteUpdate,
    Cliente,
    ClienteCambiarEstado,
    ClienteMarcarPerdido
} from '@/types/cliente';

const CLIENTES_URL = '/clientes';

// ============================================
// HOOK PRINCIPAL DE CLIENTES
// ============================================
export const useClientes = (
    busqueda = '',
    tipoEstado: string | null = null,
    comercialId: number | null = null,
    page = 1,
    pageSize = 15
) => {
    const queryClient = useQueryClient();

    // 1. Obtener Clientes (Paginado y con filtros)
    const listQuery = useQuery({
        queryKey: ['clientes', busqueda, tipoEstado, comercialId, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (tipoEstado) params.tipo_estado = tipoEstado;
            if (comercialId) params.comercial_id = comercialId;

            const { data } = await api.get<ClientePaginationResponse>(`${CLIENTES_URL}`, { params });
            return data;
        },
    });

    // 2. Crear Cliente
    const createMutation = useMutation({
        mutationFn: async (newCliente: ClienteCreate) => {
            const { data } = await api.post<ClienteOperationResult>(`${CLIENTES_URL}`, newCliente);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 3. Actualizar Cliente
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: clienteData }: { id: number; data: ClienteUpdate }) => {
            const response = await api.put<ClienteOperationResult>(`${CLIENTES_URL}/${id}`, clienteData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 4. Desactivar Cliente
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<ClienteOperationResult>(`${CLIENTES_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 5. Cambiar Estado (Prospecto <-> En Negociación <-> Cliente)
    const cambiarEstadoMutation = useMutation({
        mutationFn: async ({ id, nuevoEstado }: { id: number; nuevoEstado: string }) => {
            const payload: ClienteCambiarEstado = { nuevo_estado: nuevoEstado };
            const { data } = await api.post<ClienteOperationResult>(`${CLIENTES_URL}/${id}/cambiar-estado`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 6. Marcar Perdido
    const marcarPerdidoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: ClienteMarcarPerdido }) => {
            const { data: response } = await api.post<ClienteOperationResult>(`${CLIENTES_URL}/${id}/marcar-perdido`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 7. Reactivar
    const reactivarMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post<ClienteOperationResult>(`${CLIENTES_URL}/${id}/reactivar`, {});
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 8. Archivar (Soft Delete)
    const archivarMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post<ClienteOperationResult>(`${CLIENTES_URL}/${id}/archivar`, {});
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    return {
        listQuery,
        clientes: listQuery.data?.data || [],
        totalPages: listQuery.data?.total_pages || 1,
        totalRegistros: listQuery.data?.total || 0,
        isLoading: listQuery.isLoading,
        isError: listQuery.isError,
        error: listQuery.error,
        refetch: listQuery.refetch,
        isFetching: listQuery.isFetching,
        createMutation,
        updateMutation,
        deleteMutation,
        cambiarEstadoMutation,
        marcarPerdidoMutation,
        reactivarMutation,
        archivarMutation
    };
};



export const useClientesStats = (comercialId: number | null = null) => {
    return useQuery({
        queryKey: ['clientes-stats', comercialId],
        queryFn: async () => {
            const params: Record<string, unknown> = {};
            // Fix: Check for null/undefined explicitly so 0 is sent if needed
            if (comercialId !== null && comercialId !== undefined) {
                params.comercial_id = comercialId;
            }
            const { data } = await api.get<ClienteStats>(`${CLIENTES_URL}/stats`, { params });
            return data;
        },
        staleTime: 1000 * 60 * 2,
    });
};

// ============================================
// HOOK PARA OBTENER UN CLIENTE
// ============================================
export const useCliente = (id: number | null) => {
    return useQuery({
        queryKey: ['cliente', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<Cliente>(`${CLIENTES_URL}/${id}`);
            return data;
        },
        enabled: !!id,
    });
};
