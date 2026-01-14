import axios from 'axios';
import { CasoLlamada, CasoLlamadaCreate, CasoLlamadaUpdate } from '../types/casos-llamada';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const casosLlamadaService = {
    getAll: async (): Promise<CasoLlamada[]> => {
        const response = await axios.get(`${API_URL}/casos-llamada/`);
        return response.data;
    },

    getById: async (id: number): Promise<CasoLlamada> => {
        const response = await axios.get(`${API_URL}/casos-llamada/${id}`);
        return response.data;
    },

    create: async (caso: CasoLlamadaCreate): Promise<{ id: number }> => {
        const response = await axios.post(`${API_URL}/casos-llamada/`, caso);
        return response.data;
    },

    update: async (id: number, caso: CasoLlamadaUpdate): Promise<boolean> => {
        const response = await axios.put(`${API_URL}/casos-llamada/${id}`, caso);
        return response.data;
    },

    delete: async (id: number): Promise<boolean> => {
        const response = await axios.delete(`${API_URL}/casos-llamada/${id}`);
        return response.data;
    }
};
