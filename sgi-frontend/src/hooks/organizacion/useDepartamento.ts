import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { departamentoService } from '@/services/organizacion/departamento';
import { empleadoService } from '@/services/organizacion';
import { Departamento } from '@/types/organizacion/departamento';

// Importamos los tipos específicos
import {
  DepartamentoPaginationResponse,
  OperationResult,
  DepartamentoOption,
  DepartamentoCreate, // <-- Añadido
  DepartamentoUpdate  // <-- Añadido
} from '@/types/organizacion/departamento';

// ============================================
// HOOK PRINCIPAL DE DEPARTAMENTOS
// ============================================

export const useDepartamentos = (busqueda = '', page = 1, pageSize = 15) => {
  const queryClient = useQueryClient();

  // 1. Obtener Departamentos (Paginado y con Búsqueda)
  const listQuery = useQuery<DepartamentoPaginationResponse>({
    queryKey: ['departamentos', busqueda, page, pageSize],
    queryFn: async () => departamentoService.listar(page, pageSize, busqueda)
  });

  // 2. Crear Departamento
  const createMutation = useMutation({
    mutationFn: async (newDepto: DepartamentoCreate) => departamentoService.crear(newDepto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['departamentos-select'] });
    },
  });

  // 3. Actualizar Departamento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: deptoData }: { id: number; data: DepartamentoUpdate }) => {
      return departamentoService.actualizar(id, deptoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['departamentos-select'] });
    },
  });

  // 4. Desactivar Departamento (Borrado lógico)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return departamentoService.desactivar(id);
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
// HOOK PARA CARGAR DEPARTAMENTOS (DROPDOWN)
// ============================================

export const useDepartamentosParaSelect = () => {
  return useQuery({
    queryKey: ['departamentos-select'],
    queryFn: async () => {
      return departamentoService.obtenerDropdown();
    },
    staleTime: 0, // Siempre refetch para obtener datos actualizados
  });
};