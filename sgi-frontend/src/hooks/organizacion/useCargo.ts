import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Cargo, CargoPaginationResponse, CargoOperationResult, CargoOption } from '@/types/organizacion/cargo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const CARGOS_URL = `${API_BASE_URL}/cargos`;

// ============================================
// HOOK PRINCIPAL DE CARGOS
// ============================================
export const useCargos = (busqueda = '', areaId: number | null = null, page = 1, pageSize = 15) => {
    const queryClient = useQueryClient();

    // 1. Obtener Cargos (Paginado y con filtros)
    const listQuery = useQuery({
        queryKey: ['cargos', busqueda, areaId, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (areaId) params.area_id = areaId;

            const { data } = await axios.get<CargoPaginationResponse>(`${CARGOS_URL}/`, { params });
            return data;
        },
    });

    // 2. Crear Cargo
    const createMutation = useMutation({
        mutationFn: async (newCargo: Partial<Cargo>) => {
            const { data } = await axios.post<CargoOperationResult>(`${CARGOS_URL}/`, newCargo);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });

    // 3. Actualizar Cargo
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: cargoData }: { id: number; data: Partial<Cargo> }) => {
            const response = await axios.put<CargoOperationResult>(`${CARGOS_URL}/${id}`, cargoData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });

    // 4. Desactivar Cargo (Borrado lógico)
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.delete<CargoOperationResult>(`${CARGOS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cargos'] });
        },
    });

    return {
        listQuery,
        cargos: listQuery.data?.data || [],
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
// HOOK PARA CARGOS POR ÁREA (Expandible en árbol)
// ============================================
export const useCargosByArea = (areaId: number | null) => {
    return useQuery({
        queryKey: ['cargos', 'by-area', areaId],
        queryFn: async () => {
            if (!areaId) return [];
            const { data } = await axios.get<Cargo[]>(`${CARGOS_URL}/by-area/${areaId}`);
            return data;
        },
        enabled: !!areaId,
        staleTime: 1000 * 60 * 2, // 2 minutos de caché
    });
};

// ============================================
// HOOK PARA DROPDOWN DE CARGOS
// ============================================
export const useCargosParaSelect = () => {
    return useQuery({
        queryKey: ['cargos-select'],
        queryFn: async () => {
            const { data } = await axios.get<CargoOption[]>(`${CARGOS_URL}/dropdown`);
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });
};
