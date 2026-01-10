import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    EmpleadoPaginationResponse,
    EmpleadoOperationResult,
    EmpleadoOption,
    EmpleadoCreate,
    EmpleadoUpdate
} from '@/types/organizacion/empleado';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const EMPLEADOS_URL = `${API_BASE_URL}/empleados`;

// ============================================
// HOOK PRINCIPAL DE EMPLEADOS
// ============================================
export const useEmpleados = (
    busqueda = '',
    departamentoId: number | null = null,
    areaId: number | null = null,
    page = 1,
    pageSize = 15
) => {
    const queryClient = useQueryClient();

    // 1. Obtener Empleados (Paginado y con filtros)
    const listQuery = useQuery({
        queryKey: ['empleados', busqueda, departamentoId, areaId, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (departamentoId) params.departamento_id = departamentoId;
            if (areaId) params.area_id = areaId;

            const { data } = await axios.get<EmpleadoPaginationResponse>(`${EMPLEADOS_URL}/`, { params });
            return data;
        },
    });

    // 2. Crear Empleado
    const createMutation = useMutation({
        mutationFn: async (newEmpleado: EmpleadoCreate) => {
            const { data } = await axios.post<EmpleadoOperationResult>(`${EMPLEADOS_URL}/`, newEmpleado);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-select'] });
        },
    });

    // 3. Actualizar Empleado
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: empleadoData }: { id: number; data: EmpleadoUpdate }) => {
            const response = await axios.put<EmpleadoOperationResult>(`${EMPLEADOS_URL}/${id}`, empleadoData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-select'] });
        },
    });

    // 4. Desactivar Empleado (Soft delete - asigna fecha_cese automáticamente)
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.delete<EmpleadoOperationResult>(`${EMPLEADOS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-select'] });
        },
    });

    // 5. Reactivar Empleado (limpia fecha_cese)
    const reactivateMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.patch<EmpleadoOperationResult>(`${EMPLEADOS_URL}/${id}/reactivar`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-select'] });
        },
    });

    return {
        listQuery,
        empleados: listQuery.data?.data || [],
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
        reactivateMutation,
    };
};

// ============================================
// HOOK PARA DROPDOWN DE EMPLEADOS
// ============================================
export const useEmpleadosParaSelect = () => {
    return useQuery({
        queryKey: ['empleados-select'],
        queryFn: async () => {
            const { data } = await axios.get<EmpleadoOption[]>(`${EMPLEADOS_URL}/dropdown`);
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });
};
