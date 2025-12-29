import Cookies from 'js-cookie';

// Definimos la estructura de lo que devuelve el API (Igual que en Pydantic)
export interface Empleado {
  id: number;
  codigo_empleado: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  nro_documento: string;
  celular?: string;
  email_personal?: string;
  fecha_ingreso: string;
  activo: boolean;
  cargo_nombre?: string;
  area_nombre?: string;
  jefe_nombre_completo?: string;
}

export interface EmpleadoPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: Empleado[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Función auxiliar para obtener los headers con el Token
const getAuthHeaders = () => {
  // Buscamos la cookie 'token' que guardamos en el login
  const token = Cookies.get('token'); 
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const empleadoService = {
  
  // 1. LISTAR CON PAGINACIÓN Y FILTROS
  async listar(page = 1, pageSize = 20, busqueda = '', activo?: boolean) {
    let url = `${API_URL}/empleados?page=${page}&page_size=${pageSize}`;
    
    if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;
    if (activo !== undefined) url += `&activo=${activo}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Error al cargar empleados');
    return (await res.json()) as EmpleadoPagination;
  },

  // 2. OBTENER UNO
  async obtenerPorId(id: number) {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Empleado no encontrado');
    return (await res.json()) as Empleado;
  },

  // 3. CREAR
  async crear(datos: Partial<Empleado>) {
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

  // 4. ACTUALIZAR (PATCH)
  async actualizar(id: number, datos: Partial<Empleado>) {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    if (!res.ok) throw new Error('Error al actualizar empleado');
    return await res.json();
  },

  // 5. DESACTIVAR (DELETE)
  async desactivar(id: number) {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo desactivar el empleado');
    return await res.json();
  }
};