import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    Activo,
    ActivoCreate,
    ActivoUpdate,
    CambioEstadoRequest,
    ActivoPaginationResponse,
    ActivoOperationResult,
    ActivoHistorial,
    ActivoDropdown,
    AsignacionActivoRequest,
    DevolucionActivoRequest,
} from '@/types/organizacion/activo';

const ACTIVOS_URL = '/activos';

// ============================================
// HOOK PRINCIPAL DE ACTIVOS
// ============================================
export const useActivos = (
    busqueda = '',
    estadoFisico: string | null = null,
    isDisponible: boolean | null = null,
    empleadoId: number | null = null,
    page = 1,
    pageSize = 15,
    sinLinea: boolean = false
) => {
    const queryClient = useQueryClient();

    // Ensure busqueda is treated as a dependency for the query key
    const listQuery = useQuery({
        queryKey: ['activos', busqueda, estadoFisico, isDisponible, empleadoId, sinLinea, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (estadoFisico) params.estado_fisico = estadoFisico;
            if (isDisponible !== null) params.is_disponible = isDisponible;
            if (empleadoId !== null) params.empleado_id = empleadoId;
            if (sinLinea) params.sin_linea = true;

            const { data } = await api.get<ActivoPaginationResponse>(`${ACTIVOS_URL}/`, { params });
            return data;
        },
    });

    // Crear activo
    const createMutation = useMutation({
        mutationFn: async (newActivo: ActivoCreate) => {
            const { data } = await api.post<ActivoOperationResult>(`${ACTIVOS_URL}/`, newActivo);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
            queryClient.invalidateQueries({ queryKey: ['activos-dropdown'] });
        },
    });

    // Actualizar activo
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: activoData }: { id: number; data: ActivoUpdate }) => {
            const response = await api.put<ActivoOperationResult>(`${ACTIVOS_URL}/${id}`, activoData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
            queryClient.invalidateQueries({ queryKey: ['activos-dropdown'] });
        },
    });

    // Cambiar estado
    const cambiarEstadoMutation = useMutation({
        mutationFn: async ({ id, data: cambioData }: { id: number; data: CambioEstadoRequest }) => {
            const response = await api.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/cambiar-estado`, cambioData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
        },
    });

    // Dar de baja
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<ActivoOperationResult>(`${ACTIVOS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
            queryClient.invalidateQueries({ queryKey: ['activos-dropdown'] });
        },
    });

    // Asignar activo
    const asignarMutation = useMutation({
        mutationFn: async ({ id, data: asignacionData }: { id: number; data: AsignacionActivoRequest }) => {
            const response = await api.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/asignar`, asignacionData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
            queryClient.invalidateQueries({ queryKey: ['activos-dropdown'] });
        },
    });

    // Devolver activo
    const devolverMutation = useMutation({
        mutationFn: async ({ id, data: devolucionData }: { id: number; data: DevolucionActivoRequest }) => {
            const response = await api.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/devolver`, devolucionData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
            queryClient.invalidateQueries({ queryKey: ['activos-dropdown'] });
        },
    });


    return {
        listQuery,
        activos: listQuery.data?.data || [],
        totalPages: listQuery.data?.total_pages || 1,
        totalRegistros: listQuery.data?.total || 0,
        isLoading: listQuery.isLoading,
        isError: listQuery.isError,
        error: listQuery.error,
        refetch: listQuery.refetch,
        isFetching: listQuery.isFetching,
        createMutation,
        updateMutation,
        cambiarEstadoMutation,
        deleteMutation,
        asignarMutation,
        devolverMutation,
    };
};

// ============================================
// HOOK PARA OBTENER HISTORIAL DE UN ACTIVO
// ============================================
export const useActivoHistorial = (activoId: number | null) => {
    return useQuery({
        queryKey: ['activo-historial', activoId],
        queryFn: async () => {
            if (!activoId) return [];
            const { data } = await api.get<ActivoHistorial[]>(`${ACTIVOS_URL}/${activoId}/historial`);
            return data;
        },
        enabled: !!activoId,
    });
};

// ============================================
// HOOK PARA DROPDOWN DE ACTIVOS DISPONIBLES
// ============================================
export const useActivosDisponiblesDropdown = () => {
    return useQuery({
        queryKey: ['activos-dropdown'],
        queryFn: async () => {
            const { data } = await api.get<ActivoDropdown[]>(`${ACTIVOS_URL}/dropdown`);
            return data;
        },
        staleTime: 0,
    });
};

// ============================================
// HOOK PARA OBTENER UN ACTIVO POR ID
// ============================================
export const useActivoById = (activoId: number | null) => {
    return useQuery({
        queryKey: ['activo', activoId],
        queryFn: async () => {
            if (!activoId) return null;
            const { data } = await api.get<Activo>(`${ACTIVOS_URL}/${activoId}`);
            return data;
        },
        enabled: !!activoId,
    });
};
// ============================================
// HOOK PARA OBTENER PRODUCTOS DISTINTOS
// ============================================
export const useProductosActivos = () => {
    return useQuery({
        queryKey: ['productos-activos'],
        queryFn: async () => {
            const { data } = await api.get<string[]>(`${ACTIVOS_URL}/productos`);
            return data;
        },
    });
};
