/**
 * Servicio de Empleados - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import {
  EmpleadoPaginationResponse,
  EmpleadoOperationResult,
  EmpleadoCreate,
  EmpleadoUpdate,
  EmpleadoOption
} from '@/types/organizacion/empleado';

export const empleadoService = {
  /**
   * Listar empleados con paginación y filtros
   */
  async listar(
    page = 1,
    pageSize = 15,
    busqueda = '',
    departamentoId?: number,
    areaId?: number
  ): Promise<EmpleadoPaginationResponse> {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (busqueda) params.busqueda = busqueda;
    if (departamentoId) params.departamento_id = departamentoId;
    if (areaId) params.area_id = areaId;

    const { data } = await api.get('/empleados', { params });
    return data;
  },

  /**
   * Obtener dropdown de empleados
   */
  async obtenerDropdown(): Promise<EmpleadoOption[]> {
    const { data } = await api.get('/empleados/dropdown');
    return data;
  },

  /**
   * Crear nuevo empleado
   */
  async crear(datos: EmpleadoCreate): Promise<EmpleadoOperationResult> {
    const { data } = await api.post('/empleados/', datos);
    return data;
  },

  /**
   * Actualizar empleado existente
   */
  async actualizar(id: number, datos: EmpleadoUpdate): Promise<EmpleadoOperationResult> {
    const { data } = await api.put(`/empleados/${id}`, datos);
    return data;
  },

  /**
   * Desactivar empleado (soft delete)
   */
  async desactivar(id: number): Promise<EmpleadoOperationResult> {
    const { data } = await api.delete(`/empleados/${id}`);
    return data;
  },

  /**
   * Reactivar empleado
   */
  async reactivar(id: number): Promise<EmpleadoOperationResult> {
    const { data } = await api.patch(`/empleados/${id}/reactivar`);
    return data;
  }
};