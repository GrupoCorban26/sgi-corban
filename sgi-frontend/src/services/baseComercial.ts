import axios from 'axios';
import Cookies from 'js-cookie';
import { ContactoAsignado, CargarBaseResponse, FiltrosBaseResponse, CasoLlamada, FeedbackResponse } from '@/types/base-comercial';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
    const token = Cookies.get('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
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
    cargarBase: async (paisOrigen?: string[], partidaArancelaria?: string[]): Promise<CargarBaseResponse> => {
        const params = new URLSearchParams();
        if (paisOrigen && paisOrigen.length > 0) {
            paisOrigen.forEach(p => params.append('pais_origen', p));
        }
        if (partidaArancelaria && partidaArancelaria.length > 0) {
            partidaArancelaria.forEach(p => params.append('partida_arancelaria', p));
        }

        const response = await axios.post(
            `${API_URL}/contactos/cargar-base?${params.toString()}`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Actualiza el feedback de un contacto
     * Ahora también guarda fecha_llamada y crea cliente si caso es positivo
     */
    actualizarFeedback: async (id: number, casoId: number, comentario: string): Promise<FeedbackResponse> => {
        const response = await axios.put(
            `${API_URL}/contactos/${id}/feedback?caso_id=${casoId}&comentario=${encodeURIComponent(comentario)}`,
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
