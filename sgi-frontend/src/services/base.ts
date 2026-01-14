import axios from 'axios';
import { BaseResponse } from '../types/base';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const baseService = {
    getBase: async (page: number, pageSize: number, search?: string): Promise<BaseResponse> => {
        const response = await axios.get(`${API_URL}/base/`, {
            params: {
                page,
                page_size: pageSize,
                ...(search ? { search } : {})
            }
        });
        return response.data;
    },

    getStats: async () => {
        const response = await axios.get(`${API_URL}/base/stats`);
        return response.data;
    }
};
