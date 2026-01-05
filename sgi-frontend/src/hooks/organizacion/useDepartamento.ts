import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios'; // O tu instancia configurada de axios
import { Departamento, PaginationResponse, OperationResult } from '@/types/organizacion/departamento';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEPTOS_URL = `${API_BASE_URL}/departamentos`;

export const useDepartamentos = (busqueda = '', page = 1, pageSize = 15) => {
  const queryClient = useQueryClient();

  // 1. Obtener Departamentos (Paginado y con Búsqueda)
  const listQuery = useQuery({
    queryKey: ['departamentos', busqueda, page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<PaginationResponse>(`${DEPTOS_URL}/`, {
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<Departamento> }) => {
      const response = await axios.put<OperationResult>(`${DEPTOS_URL}/${id}`, data);
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
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};