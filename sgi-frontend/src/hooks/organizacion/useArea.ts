import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Area, AreaPaginationResponse, AreaOperationResult, AreaOption } from '@/types/organizacion/area';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const AREAS_URL = `${API_BASE_URL}/areas`;

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

            const { data } = await axios.get<AreaPaginationResponse>(`${AREAS_URL}/`, { params });
            return data;
        },
    });

    // 2. Crear Área
    const createMutation = useMutation({
        mutationFn: async (newArea: Partial<Area>) => {
            const { data } = await axios.post<AreaOperationResult>(`${AREAS_URL}/`, newArea);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
    });

    // 3. Actualizar Área
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: areaData }: { id: number; data: Partial<Area> }) => {
            const response = await axios.put<AreaOperationResult>(`${AREAS_URL}/${id}`, areaData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
    });

    // 4. Desactivar Área (Borrado lógico)
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.delete<AreaOperationResult>(`${AREAS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['areas'] });
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
            const { data } = await axios.get<Area[]>(`${AREAS_URL}/by-departamento/${deptoId}`);
            return data;
        },
        enabled: !!deptoId, // Solo ejecuta si hay deptoId
        staleTime: 1000 * 60 * 2, // 2 minutos de caché
    });
};


export const useAreasParaSelect = () => {
    return useQuery({
        queryKey: ['areas-select'],
        queryFn: async () => {
            const { data } = await axios.get<AreaOption[]>(`${AREAS_URL}/dropdown`);
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });
};