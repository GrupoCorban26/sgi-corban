import Cookies from 'js-cookie';
import {
  Empleado,
  EmpleadoPaginationResponse,
  EmpleadoOperationResult,
  EmpleadoCreate,
  EmpleadoUpdate,
  EmpleadoOption
} from '@/types/organizacion/empleado';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Función auxiliar para obtener los headers con el Token
const getAuthHeaders = () => {
  const token = Cookies.get('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const empleadoService = {

  // 1. LISTAR CON PAGINACIÓN Y FILTROS
  async listar(
    page = 1,
    pageSize = 15,
    busqueda = '',
    departamentoId?: number,
    areaId?: number
  ): Promise<EmpleadoPaginationResponse> {
    let url = `${API_URL}/empleados?page=${page}&page_size=${pageSize}`;

    if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;
    if (departamentoId) url += `&departamento_id=${departamentoId}`;
    if (areaId) url += `&area_id=${areaId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Error al cargar empleados');
    return await res.json();
  },

  // 2. OBTENER DROPDOWN
  async obtenerDropdown(): Promise<EmpleadoOption[]> {
    const res = await fetch(`${API_URL}/empleados/dropdown`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al cargar lista de empleados');
    return await res.json();
  },

  // 3. CREAR
  async crear(datos: EmpleadoCreate): Promise<EmpleadoOperationResult> {
    const res = await fetch(`${API_URL}/empleados/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al crear empleado');
    }
    return await res.json();
  },

  // 4. ACTUALIZAR (PUT)
  async actualizar(id: number, datos: EmpleadoUpdate): Promise<EmpleadoOperationResult> {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al actualizar empleado');
    }
    return await res.json();
  },

  // 5. DESACTIVAR (DELETE - asigna fecha_cese automáticamente)
  async desactivar(id: number): Promise<EmpleadoOperationResult> {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo desactivar el empleado');
    }
    return await res.json();
  },

  // 6. REACTIVAR (limpia fecha_cese)
  async reactivar(id: number): Promise<EmpleadoOperationResult> {
    const res = await fetch(`${API_URL}/empleados/${id}/reactivar`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'No se pudo reactivar el empleado');
    }
    return await res.json();
  }
};