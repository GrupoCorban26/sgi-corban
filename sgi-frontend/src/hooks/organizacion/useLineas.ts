import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    Linea,
    LineaPaginationResponse,
    LineaOperationResult,
    LineaCreate,
    LineaUpdate,
    CambiarCelularRequest,
    AsignarEmpleadoRequest,
    LineaHistorial,
    LineaDropdown
} from '@/types/organizacion/linea';

const LINEAS_URL = '/lineas';

// ============================================
// HOOK PRINCIPAL DE LÍNEAS CORPORATIVAS
// ============================================
export const useLineas = (
    busqueda = '',
    empleadoId: number | null = null,
    soloDisponibles: boolean | null = null,
    page = 1,
    pageSize = 15
) => {
    const queryClient = useQueryClient();

    // Listar líneas
    const listQuery = useQuery({
        queryKey: ['lineas', busqueda, empleadoId, soloDisponibles, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (empleadoId !== null) params.empleado_id = empleadoId;
            if (soloDisponibles !== null) params.solo_disponibles = soloDisponibles;

            const { data } = await api.get<LineaPaginationResponse>(`${LINEAS_URL}/`, { params });
            return data;
        },
    });

    // Crear línea
    const createMutation = useMutation({
        mutationFn: async (newLinea: LineaCreate) => {
            const { data } = await api.post<LineaOperationResult>(`${LINEAS_URL}/`, newLinea);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
            queryClient.invalidateQueries({ queryKey: ['lineas-dropdown'] });
        },
    });

    // Actualizar línea
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: lineaData }: { id: number; data: LineaUpdate }) => {
            const response = await api.put<LineaOperationResult>(`${LINEAS_URL}/${id}`, lineaData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
        },
    });

    // Cambiar celular
    const cambiarCelularMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CambiarCelularRequest }) => {
            const response = await api.post<LineaOperationResult>(`${LINEAS_URL}/${id}/cambiar-celular`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
            queryClient.invalidateQueries({ queryKey: ['activos'] });
        },
    });

    // Asignar empleado
    const asignarEmpleadoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: AsignarEmpleadoRequest }) => {
            const response = await api.post<LineaOperationResult>(`${LINEAS_URL}/${id}/asignar`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
        },
    });

    // Desasignar empleado
    const desasignarMutation = useMutation({
        mutationFn: async ({ id, observaciones }: { id: number; observaciones?: string }) => {
            const response = await api.post<LineaOperationResult>(`${LINEAS_URL}/${id}/desasignar`, null, {
                params: { observaciones }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
            queryClient.invalidateQueries({ queryKey: ['lineas-dropdown'] });
        },
    });

    // Dar de baja
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<LineaOperationResult>(`${LINEAS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineas'] });
            queryClient.invalidateQueries({ queryKey: ['lineas-dropdown'] });
        },
    });

    return {
        listQuery,
        lineas: listQuery.data?.data || [],
        totalPages: listQuery.data?.total_pages || 1,
        totalRegistros: listQuery.data?.total || 0,
        isLoading: listQuery.isLoading,
        isError: listQuery.isError,
        error: listQuery.error,
        refetch: listQuery.refetch,
        isFetching: listQuery.isFetching,
        createMutation,
        updateMutation,
        cambiarCelularMutation,
        asignarEmpleadoMutation,
        desasignarMutation,
        deleteMutation,
    };
};

// ============================================
// HOOK PARA OBTENER UNA LÍNEA
// ============================================
export const useLinea = (lineaId: number | null) => {
    return useQuery({
        queryKey: ['linea', lineaId],
        queryFn: async () => {
            if (!lineaId) return null;
            const { data } = await api.get<Linea>(`${LINEAS_URL}/${lineaId}`);
            return data;
        },
        enabled: !!lineaId,
    });
};

// ============================================
// HOOK PARA HISTORIAL DE LÍNEA
// ============================================
export const useLineaHistorial = (lineaId: number | null) => {
    return useQuery({
        queryKey: ['linea-historial', lineaId],
        queryFn: async () => {
            if (!lineaId) return [];
            const { data } = await api.get<LineaHistorial[]>(`${LINEAS_URL}/${lineaId}/historial`);
            return data;
        },
        enabled: !!lineaId,
    });
};

// ============================================
// HOOK PARA DROPDOWN DE LÍNEAS DISPONIBLES
// ============================================
export const useLineasDisponibles = () => {
    return useQuery({
        queryKey: ['lineas-dropdown'],
        queryFn: async () => {
            const { data } = await api.get<LineaDropdown[]>(`${LINEAS_URL}/dropdown`);
            return data;
        },
        staleTime: 0,
    });
};
