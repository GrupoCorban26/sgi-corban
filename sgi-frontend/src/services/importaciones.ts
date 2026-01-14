import axios from 'axios';
import { ImportacionResponse } from '../types/importaciones';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const importacionesService = {
    getImportaciones: async (page: number, pageSize: number, search?: string, sinTelefono?: boolean): Promise<ImportacionResponse> => {
        const response = await axios.get(`${API_URL}/importaciones/`, {
            params: {
                page,
                page_size: pageSize,
                ...(search ? { search } : {}),
                ...(sinTelefono ? { sin_telefono: true } : {})
            }
        });
        return response.data;
    },

    uploadImportaciones: async (file: File): Promise<{ success: boolean; message: string; records_count: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/importaciones/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
