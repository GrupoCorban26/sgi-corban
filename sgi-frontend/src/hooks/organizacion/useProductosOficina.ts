import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    ProductoOficina,
    ProductoOficinaCreate,
    ProductoOficinaUpdate,
    ProductoOficinaPaginationResponse,
    AjusteStockRequest,
    CategoriaProductoOficina,
    CategoriaCreate,
    CategoriaUpdate,
    OperationResult,
} from '@/types/organizacion/producto-oficina';

const BASE_URL = '/productos-oficina';

// ============================================================
// Hook para Categorías
// ============================================================

export const useCategorias = () => {
    const queryClient = useQueryClient();

    const listQuery = useQuery({
        queryKey: ['categorias-producto-oficina'],
        queryFn: async () => {
            const { data } = await api.get<CategoriaProductoOficina[]>(`${BASE_URL}/categorias/`);
            return data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (datos: CategoriaCreate) => {
            const { data } = await api.post<OperationResult>(`${BASE_URL}/categorias/`, datos);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorias-producto-oficina'] });
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: CategoriaUpdate }) => {
            const { data } = await api.put<OperationResult>(`${BASE_URL}/categorias/${id}`, datos);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorias-producto-oficina'] });
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<OperationResult>(`${BASE_URL}/categorias/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorias-producto-oficina'] });
        },
    });

    return {
        categorias: listQuery.data || [],
        isLoading: listQuery.isLoading,
        createMutation,
        updateMutation,
        deleteMutation,
    };
};

// ============================================================
// Hook principal para Productos de Oficina
// ============================================================

export const useProductosOficina = (
    busqueda = '',
    categoriaId: number | null = null,
    soloStockBajo = false,
    page = 1,
    pageSize = 15,
) => {
    const queryClient = useQueryClient();

    // Listar productos (paginado con filtros)
    const listQuery = useQuery({
        queryKey: ['productos-oficina', busqueda, categoriaId, soloStockBajo, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (categoriaId) params.categoria_id = categoriaId;
            if (soloStockBajo) params.solo_stock_bajo = true;

            const { data } = await api.get<ProductoOficinaPaginationResponse>(`${BASE_URL}/`, { params });
            return data;
        },
    });

    // Crear producto
    const createMutation = useMutation({
        mutationFn: async (datos: ProductoOficinaCreate) => {
            const { data } = await api.post<OperationResult>(`${BASE_URL}/`, datos);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
            queryClient.invalidateQueries({ queryKey: ['categorias-producto-oficina'] });
        },
    });

    // Actualizar producto
    const updateMutation = useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: ProductoOficinaUpdate }) => {
            const { data } = await api.put<OperationResult>(`${BASE_URL}/${id}`, datos);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
        },
    });

    // Eliminar producto
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete<OperationResult>(`${BASE_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
            queryClient.invalidateQueries({ queryKey: ['categorias-producto-oficina'] });
        },
    });

    // Ajustar stock
    const ajusteStockMutation = useMutation({
        mutationFn: async ({ id, ajuste }: { id: number; ajuste: AjusteStockRequest }) => {
            const { data } = await api.patch<OperationResult>(`${BASE_URL}/${id}/stock`, ajuste);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos-oficina'] });
        },
    });

    return {
        // Data
        productos: listQuery.data?.data || [],
        pagination: {
            total: listQuery.data?.total || 0,
            totalPages: listQuery.data?.total_pages || 0,
            page: listQuery.data?.page || 1,
        },

        // States
        isLoading: listQuery.isLoading,
        isFetching: listQuery.isFetching,

        // Mutations
        createMutation,
        updateMutation,
        deleteMutation,
        ajusteStockMutation,
    };
};
