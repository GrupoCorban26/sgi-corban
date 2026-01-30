import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Area, AreaPaginationResponse, AreaOperationResult, AreaOption } from '@/types/organizacion/area';

const AREAS_URL = '/areas';

// ============================================
// HOOK PRINCIPAL DE ÁREAS
// ============================================
export const useAreas = (busqueda = '', departamentoId: number | null = null, page = 1, pageSize = 15) => {
    const queryClient = useQueryClient();

    // 1. Obtener Áreas (Paginado y con filtros)
    const listQuery = useQuery({
        queryKey: ['areas', busqueda, departamentoId, page, pageSize],
        queryFn: async () => {
            const params: any = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (departamentoId) params.departamento_id = departamentoId;

            const { data } = await api.get<AreaPaginationResponse>(`${AREAS_URL}/`, { params });
            return data;
        },
    });

    // 2. Crear Área
    const createMutation = useMutation({
        mutationFn: async (newArea: Partial<Area>) => {
            const { data } = await api.post<AreaOperationResult>(`${AREAS_URL}/`, newArea);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            queryClient.invalidateQueries({ queryKey: ['areas-select'] });
        },
    });

    // 3. Actualizar Área
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: areaData }: { id: number; data: Partial<Area> }) => {
            const response = await api.put<AreaOperationResult>(`${AREAS_URL}/${id}`, areaData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            queryClient.invalidateQueries({ queryKey: ['areas-select'] });
        },
    });

    // 4. Desactivar Área (Borrado lógico)
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<AreaOperationResult>(`${AREAS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            queryClient.invalidateQueries({ queryKey: ['areas-select'] });
        },
    });

    return {
        listQuery,
        areas: listQuery.data?.data || [],
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
    };
};

// ============================================
// HOOK PARA ÁREAS POR DEPARTAMENTO (Expandible)
// ============================================
export const useAreasByDepartamento = (deptoId: number | null) => {
    return useQuery({
        queryKey: ['areas', 'by-depto', deptoId],
        queryFn: async () => {
            if (!deptoId) return [];
            const { data } = await api.get<Area[]>(`${AREAS_URL}/by-departamento/${deptoId}`);
            return data;
        },
        enabled: !!deptoId, // Solo ejecuta si hay deptoId
        staleTime: 0, // Siempre refetch para obtener datos actualizados
    });
};


export const useAreasParaSelect = () => {
    return useQuery({
        queryKey: ['areas-select'],
        queryFn: async () => {
            const { data } = await api.get<AreaOption[]>(`${AREAS_URL}/dropdown`);
            return data;
        },
        staleTime: 0, // Siempre refetch para obtener datos actualizados
    });
};