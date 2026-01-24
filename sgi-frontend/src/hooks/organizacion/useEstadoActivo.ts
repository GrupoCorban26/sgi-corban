import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { EstadoActivoDropdown } from '@/types/organizacion/estado_activo';

export interface EstadoActivo {
    id: number;
    nombre: string;
    descripcion: string | null;
}

export interface EstadoActivoCreate {
    nombre: string;
    descripcion?: string;
}

export interface EstadoActivoUpdate {
    nombre?: string;
    descripcion?: string;
}

interface EstadoActivoResponse {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    data: EstadoActivo[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const ESTADOS_URL = `${API_BASE_URL}/estados-activo`;

export const useEstadosActivo = (
    busqueda = '',
    page = 1,
    pageSize = 10
) => {
    const queryClient = useQueryClient();

    // Listar estados (paginado)
    const listQuery = useQuery({
        queryKey: ['estados-activo', 'list', busqueda, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;

            const { data } = await axios.get<EstadoActivoResponse>(`${ESTADOS_URL}/`, { params });
            return data;
        },
    });

    // Dropdown de estados
    const dropdownQuery = useQuery({
        queryKey: ['estados-activo', 'dropdown'],
        queryFn: async () => {
            const { data } = await axios.get<EstadoActivoDropdown[]>(`${ESTADOS_URL}/dropdown`);
            return data;
        },
    });

    // Crear estado
    const createMutation = useMutation({
        mutationFn: async (data: EstadoActivoCreate) => {
            const res = await axios.post(`${ESTADOS_URL}/`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['estados-activo'] });
        },
    });

    // Actualizar estado
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: EstadoActivoUpdate }) => {
            const res = await axios.put(`${ESTADOS_URL}/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['estados-activo'] });
        },
    });

    // Eliminar estado
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await axios.delete(`${ESTADOS_URL}/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['estados-activo'] });
        },
    });

    return {
        // Data sources
        estados: dropdownQuery.data || [],
        listData: listQuery.data?.data || [],
        pagination: {
            total: listQuery.data?.total || 0,
            totalPages: listQuery.data?.total_pages || 0,
            page: listQuery.data?.page || 1,
        },

        // States
        isLoading: dropdownQuery.isLoading || listQuery.isLoading,
        isError: dropdownQuery.isError || listQuery.isError,
        isFetching: listQuery.isFetching,

        // Actions
        createMutation,
        updateMutation,
        deleteMutation,
    };
};
