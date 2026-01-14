import axios from 'axios';
import { ContactoAsignado, CargarBaseResponse, FiltrosBaseResponse, CasoLlamada } from '@/types/base-comercial';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const baseComercialService = {
    /**
     * Obtiene los contactos asignados al comercial actual
     */
    getMisContactos: async (): Promise<ContactoAsignado[]> => {
        const response = await axios.get(`${API_URL}/contactos/mis-asignados`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Carga 50 contactos nuevos de la base filtrada
     */
    cargarBase: async (paisOrigen?: string, partidaArancelaria?: string): Promise<CargarBaseResponse> => {
        const params = new URLSearchParams();
        if (paisOrigen) params.append('pais_origen', paisOrigen);
        if (partidaArancelaria) params.append('partida_arancelaria', partidaArancelaria);

        const response = await axios.post(
            `${API_URL}/contactos/cargar-base?${params.toString()}`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Actualiza el feedback de un contacto
     */
    actualizarFeedback: async (id: number, casoId: number, comentario: string): Promise<{ success: boolean }> => {
        const response = await axios.put(
            `${API_URL}/contactos/${id}/feedback?caso_id=${casoId}&comentario=${encodeURIComponent(comentario)}`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Envía todo el feedback y marca como gestionados
     */
    enviarFeedbackLote: async (): Promise<{ success: boolean; contactos_procesados: number }> => {
        const response = await axios.post(
            `${API_URL}/contactos/enviar-feedback`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Obtiene los filtros disponibles (países y partidas)
     */
    getFiltros: async (): Promise<FiltrosBaseResponse> => {
        const response = await axios.get(`${API_URL}/contactos/filtros-base`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Obtiene los casos de llamada disponibles
     */
    getCasosLlamada: async (): Promise<CasoLlamada[]> => {
        const response = await axios.get(`${API_URL}/casos-llamada`, {
            headers: getAuthHeaders()
        });
        return response.data;
    }
};
