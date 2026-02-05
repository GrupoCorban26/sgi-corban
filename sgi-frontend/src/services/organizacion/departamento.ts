import api from '@/lib/axios';

import {
  DepartamentoPaginationResponse,
  OperationResult,
  DepartamentoOption,
  DepartamentoCreate,
  DepartamentoUpdate
} from '@/types/organizacion/departamento';

export const departamentoService = {
  async listar(
    page = 1,
    pageSize = 15,
    busqueda = ''
  ): Promise<DepartamentoPaginationResponse> {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (busqueda) params.busqueda = busqueda;

    const { data } = await api.get('/departamentos', { params });
    return data;
  },

  async obtenerDropdown(): Promise<DepartamentoOption[]> {
    const { data } = await api.get('/departamentos/dropdown')
    return data
  },

  async crear(datos: DepartamentoCreate): Promise<OperationResult> {
    const { data } = await api.post('/departamentos/', datos)
    return data
  },

  async actualizar(id: number, datos: DepartamentoUpdate): Promise<OperationResult> {
    const { data } = await api.put(`/departamentos/${id}`, datos)
    return data
  },

  async desactivar(id: number): Promise<OperationResult> {
    const { data } = await api.delete(`/departamentos/${id}`)
    return data
  },

  async reactivar(id: number): Promise<OperationResult> {
    const { data } = await api.patch(`/departamentos/${id}/reactivar`)
    return data
  }
}