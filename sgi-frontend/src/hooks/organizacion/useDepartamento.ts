import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Departamento,
  DepartamentoPaginationResponse,
  OperationResult,
  EmpleadoOption,
  DepartamentoOption
} from '@/types/organizacion/departamento';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEPTOS_URL = `${API_BASE_URL}/departamentos`;
const EMPLEADOS_URL = `${API_BASE_URL}/empleados`; // Plural - correcto

// ============================================
// HOOK PRINCIPAL DE DEPARTAMENTOS
// ============================================
export const useDepartamentos = (busqueda = '', page = 1, pageSize = 15) => {
  const queryClient = useQueryClient();

  // 1. Obtener Departamentos (Paginado y con Búsqueda)
  const listQuery = useQuery({
    queryKey: ['departamentos', busqueda, page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<DepartamentoPaginationResponse>(`${DEPTOS_URL}/`, {
        params: { busqueda, page, page_size: pageSize },
      });
      return data;
    },
  });

  // 2. Crear Departamento
  const createMutation = useMutation({
    mutationFn: async (newDepto: Partial<Departamento>) => {
      const { data } = await axios.post<OperationResult>(`${DEPTOS_URL}/`, newDepto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
    },
  });

  // 3. Actualizar Departamento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: deptoData }: { id: number; data: Partial<Departamento> }) => {
      const response = await axios.put<OperationResult>(`${DEPTOS_URL}/${id}`, deptoData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
    },
  });

  // 4. Desactivar Departamento (Borrado lógico)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axios.delete<OperationResult>(`${DEPTOS_URL}/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
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
      const { data } = await axios.get<EmpleadoOption[]>(`${EMPLEADOS_URL}/dropdown`);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};

// ============================================
// HOOK PARA CARGAR DEPARTAMENTOS (DROPDOWN)
// ============================================

export const useDepartamentosParaSelect = () => {
  return useQuery({
    queryKey: ['departamentos-select'],
    queryFn: async () => {
      const { data } = await axios.get<DepartamentoOption[]>(`${DEPTOS_URL}/dropdown`);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};