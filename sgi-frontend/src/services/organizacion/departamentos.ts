import { apiFetch } from "../apiClient";

// 1. Definimos la interfaz para tener autocompletado y evitar errores
export interface DepartamentoData {
  nombre: string;
  descripcion?: string;
  responsable_id?: number | null;
}

export const departamentoService = {

  // 1. Listar departamentos con paginación
  // Agregamos parámetros para que coincida con tu endpoint: /departamentos/?page=1&page_size=10
  getDepartamentos: async (page: number = 1, pageSize: number = 10) => {
    return await apiFetch(`/departamentos?page=${page}&page_size=${pageSize}`);
  },

  // 2. Crear departamento
  // Enviamos un objeto completo para que sea más fácil de escalar
  createDepartamento: async (data: DepartamentoData) => {
    return await apiFetch('/departamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // 3. Actualizar departamento
  // Corregimos el ID a number y pasamos el body con los datos a actualizar
  updateDepartamento: async (id: number, data: DepartamentoData) => {
    return await apiFetch(`/departamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 4. Eliminar departamento (Eliminación lógica según tu SP)
  deleteDepartamento: async (id: number) => {
    return await apiFetch(`/departamentos/${id}`, {
      method: 'DELETE',
    });
  }
};