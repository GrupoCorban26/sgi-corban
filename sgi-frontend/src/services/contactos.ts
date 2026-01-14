import axios from 'axios';
import { Contacto, ContactosListResponse } from '../types/contactos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const contactosService = {
    getByRuc: async (ruc: string): Promise<Contacto[]> => {
        const response = await axios.get(`${API_URL}/contactos/ruc/${ruc}`);
        return response.data;
    },

    getPaginated: async (
        page: number = 1,
        pageSize: number = 20,
        search?: string,
        estado?: string
    ): Promise<ContactosListResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('page_size', pageSize.toString());
        if (search) params.append('search', search);
        if (estado) params.append('estado', estado);

        const response = await axios.get(`${API_URL}/contactos/list/paginated?${params}`);
        return response.data;
    },

    getStats: async () => {
        const response = await axios.get(`${API_URL}/contactos/stats`);
        return response.data;
    },

    create: async (contacto: Omit<Contacto, 'id'>): Promise<boolean> => {
        const response = await axios.post(`${API_URL}/contactos/`, contacto);
        return response.data;
    },

    update: async (id: number, contacto: Partial<Contacto>): Promise<boolean> => {
        const response = await axios.put(`${API_URL}/contactos/${id}`, contacto);
        return response.data;
    },

    delete: async (id: number): Promise<boolean> => {
        const response = await axios.delete(`${API_URL}/contactos/${id}`);
        return response.data;
    },

    upload: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/contactos/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    assignBatch: async (): Promise<Contacto[]> => {
        const response = await axios.post(`${API_URL}/contactos/assign-batch`);
        return response.data;
    }
};

