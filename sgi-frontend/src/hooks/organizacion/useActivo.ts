import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const ACTIVOS_URL = `${API_BASE_URL}/activos`;

// ============================================
// HOOK PRINCIPAL DE ACTIVOS
// ============================================
export const useActivos = (
    busqueda = '',
    estadoFisico: string | null = null,
    isDisponible: boolean | null = null,
    page = 1,
    pageSize = 15
) => {
    const queryClient = useQueryClient();

    // Listar activos
    const listQuery = useQuery({
        queryKey: ['activos', busqueda, estadoFisico, isDisponible, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (estadoFisico) params.estado_fisico = estadoFisico;
            if (isDisponible !== null) params.is_disponible = isDisponible;

            const { data } = await axios.get<ActivoPaginationResponse>(`${ACTIVOS_URL}/`, { params });
            return data;
        },
    });

    // Crear activo
    const createMutation = useMutation({
        mutationFn: async (newActivo: ActivoCreate) => {
            const { data } = await axios.post<ActivoOperationResult>(`${ACTIVOS_URL}/`, newActivo);
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
            const response = await axios.put<ActivoOperationResult>(`${ACTIVOS_URL}/${id}`, activoData);
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
            const response = await axios.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/cambiar-estado`, cambioData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activos'] });
        },
    });

    // Dar de baja
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.delete<ActivoOperationResult>(`${ACTIVOS_URL}/${id}`);
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
            const response = await axios.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/asignar`, asignacionData);
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
            const response = await axios.post<ActivoOperationResult>(`${ACTIVOS_URL}/${id}/devolver`, devolucionData);
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
            const { data } = await axios.get<ActivoHistorial[]>(`${ACTIVOS_URL}/${activoId}/historial`);
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
            const { data } = await axios.get<ActivoDropdown[]>(`${ACTIVOS_URL}/dropdown`);
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
            const { data } = await axios.get<Activo>(`${ACTIVOS_URL}/${activoId}`);
            return data;
        },
        enabled: !!activoId,
    });
};
