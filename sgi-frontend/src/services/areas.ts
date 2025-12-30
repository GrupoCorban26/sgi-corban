import Cookies from 'js-cookie';
import { Area, AreaPaginationResponse, OperationResult } from '@/types/areas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Cookies.get('token')}`
});

export const areaService = {
    // 1. Listar con paginación
    async getAreas(page = 1, pageSize = 10, busqueda = ''): Promise<AreaPaginationResponse> {
        const query = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
            ...(busqueda && { busqueda })
        });
        
        const res = await fetch(`${API_URL}/areas?${query}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Error al obtener áreas');
        return res.json();
    },

    // 2. Guardar (Crear/Editar)
    async saveArea(area: Partial<Area>): Promise<OperationResult> {
        const res = await fetch(`${API_URL}/areas`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(area),
        });
        return res.json();
    },

    // 3. Cambiar Estado
    async toggleStatus(id: number, isActive: boolean): Promise<OperationResult> {
        const res = await fetch(`${API_URL}/areas/${id}/estado?is_active=${isActive}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });
        return res.json();
    }
};