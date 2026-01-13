import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    UsuarioPaginationResponse,
    UsuarioOperationResult,
    RolOption,
    EmpleadoSinUsuario,
    UsuarioCreate,
    UsuarioUpdate
} from '@/types/usuario';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USUARIOS_URL = `${API_BASE_URL}/usuarios`;

// ============================================
// HOOK PRINCIPAL DE USUARIOS
// ============================================
export const useUsuarios = (
    busqueda = '',
    isActive: boolean | null = null,
    rolId: number | null = null,
    page = 1,
    pageSize = 15
) => {
    const queryClient = useQueryClient();

    // 1. Obtener Usuarios (Paginado y con filtros)
    const listQuery = useQuery({
        queryKey: ['usuarios', busqueda, isActive, rolId, page, pageSize],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, page_size: pageSize };
            if (busqueda) params.busqueda = busqueda;
            if (isActive !== null) params.is_active = isActive;
            if (rolId) params.rol_id = rolId;

            const { data } = await axios.get<UsuarioPaginationResponse>(`${USUARIOS_URL}`, { params });
            return data;
        },
    });

    // 2. Crear Usuario
    const createMutation = useMutation({
        mutationFn: async (newUsuario: UsuarioCreate) => {
            const { data } = await axios.post<UsuarioOperationResult>(`${USUARIOS_URL}`, newUsuario);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-sin-usuario'] });
        },
    });

    // 3. Actualizar Usuario
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: usuarioData }: { id: number; data: UsuarioUpdate }) => {
            const response = await axios.put<UsuarioOperationResult>(`${USUARIOS_URL}/${id}`, usuarioData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
        },
    });

    // 4. Desactivar Usuario
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.delete<UsuarioOperationResult>(`${USUARIOS_URL}/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-sin-usuario'] });
        },
    });

    // 5. Reactivar Usuario
    const reactivateMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await axios.put<UsuarioOperationResult>(`${USUARIOS_URL}/${id}/reactivar`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
            queryClient.invalidateQueries({ queryKey: ['empleados-sin-usuario'] });
        },
    });

    // 6. Cambiar Contraseña
    const changePasswordMutation = useMutation({
        mutationFn: async ({ id, password }: { id: number; password: string }) => {
            const { data } = await axios.put<UsuarioOperationResult>(`${USUARIOS_URL}/${id}/password`, { password });
            return data;
        },
    });

    return {
        listQuery,
        usuarios: listQuery.data?.data || [],
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
        changePasswordMutation,
    };
};

// ============================================
// HOOK PARA ROLES DROPDOWN
// ============================================
export const useRoles = () => {
    return useQuery({
        queryKey: ['roles-dropdown'],
        queryFn: async () => {
            const { data } = await axios.get<RolOption[]>(`${USUARIOS_URL}/roles/dropdown`);
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
};

// ============================================
// HOOK PARA EMPLEADOS SIN USUARIO
// ============================================
export const useEmpleadosSinUsuario = () => {
    return useQuery({
        queryKey: ['empleados-sin-usuario'],
        queryFn: async () => {
            const { data } = await axios.get<EmpleadoSinUsuario[]>(`${USUARIOS_URL}/empleados/disponibles`);
            return data;
        },
        staleTime: 1000 * 60 * 2,
    });
};
