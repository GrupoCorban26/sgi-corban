import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Departamento,
  DepartamentoPaginationResponse,
  OperationResult,
  EmpleadoOption,
  DepartamentoOption
} from '@/types/organizacion/departamento';

const DEPTOS_URL = '/departamentos';
const EMPLEADOS_URL = '/empleados';

// ============================================
// HOOK PRINCIPAL DE DEPARTAMENTOS
// ============================================
export const useDepartamentos = (busqueda = '', page = 1, pageSize = 15) => {
  const queryClient = useQueryClient();

  // 1. Obtener Departamentos (Paginado y con Búsqueda)
  const listQuery = useQuery({
    queryKey: ['departamentos', busqueda, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<DepartamentoPaginationResponse>(`${DEPTOS_URL}/`, {
        params: { busqueda, page, page_size: pageSize },
      });
      return data;
    },
  });

  // 2. Crear Departamento
  const createMutation = useMutation({
    mutationFn: async (newDepto: Partial<Departamento>) => {
      const { data } = await api.post<OperationResult>(`${DEPTOS_URL}/`, newDepto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['departamentos-select'] });
    },
  });

  // 3. Actualizar Departamento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: deptoData }: { id: number; data: Partial<Departamento> }) => {
      const response = await api.put<OperationResult>(`${DEPTOS_URL}/${id}`, deptoData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['departamentos-select'] });
    },
  });

  // 4. Desactivar Departamento (Borrado lógico)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<OperationResult>(`${DEPTOS_URL}/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['departamentos-select'] });
    },
  });

  return {
    // Query de listado
    listQuery,
    departamentos: listQuery.data?.data || [],
    totalPages: listQuery.data?.total_pages || 1,
    totalRegistros: listQuery.data?.total || 0,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    isFetching: listQuery.isFetching,
    // Mutaciones
    createMutation,
    updateMutation,
    deleteMutation,
  };
};

// ============================================
// HOOK PARA CARGAR EMPLEADOS (DROPDOWN)
// ============================================
export const useEmpleadosParaSelect = () => {
  return useQuery({
    queryKey: ['empleados-select'],
    queryFn: async () => {
      // Usamos el endpoint dropdown que devuelve formato simple
      const { data } = await api.get<EmpleadoOption[]>(`${EMPLEADOS_URL}/dropdown`);
      return data;
    },
    staleTime: 0, // Siempre refetch para obtener datos actualizados
  });
};

// ============================================
// HOOK PARA CARGAR DEPARTAMENTOS (DROPDOWN)
// ============================================

export const useDepartamentosParaSelect = () => {
  return useQuery({
    queryKey: ['departamentos-select'],
    queryFn: async () => {
      const { data } = await api.get<DepartamentoOption[]>(`${DEPTOS_URL}/dropdown`);
      return data;
    },
    staleTime: 0, // Siempre refetch para obtener datos actualizados
  });
};