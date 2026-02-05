/**
 * Servicio de Base Comercial - Estandarizado con lib/axios
 * Usa interceptores para inyección automática de token
 */
import api from '@/lib/axios';
import {
    ContactoAsignado,
    CargarBaseResponse,
    FiltrosBaseResponse,
    CasoLlamada,
    FeedbackResponse
} from '@/types/base-comercial';

export const baseComercialService = {
    /**
     * Obtiene los contactos asignados al comercial actual
     */
    async getMisContactos(): Promise<ContactoAsignado[]> {
        const { data } = await api.get('/contactos/mis-asignados');
        return data;
    },

    /**
     * Carga 50 contactos nuevos de la base filtrada
     */
    async cargarBase(paisOrigen?: string[], partidaArancelaria?: string[]): Promise<CargarBaseResponse> {
        const params = new URLSearchParams();
        if (paisOrigen?.length) {
            paisOrigen.forEach(p => params.append('pais_origen', p));
        }
        if (partidaArancelaria?.length) {
            partidaArancelaria.forEach(p => params.append('partida_arancelaria', p));
        }

        const { data } = await api.post(`/contactos/cargar-base?${params.toString()}`);
        return data;
    },

    /**
     * Actualiza el feedback de un contacto
     */
    async actualizarFeedback(id: number, casoId: number, comentario: string): Promise<FeedbackResponse> {
        const params = new URLSearchParams({
            caso_id: casoId.toString(),
            comentario
        });
        const { data } = await api.put(`/contactos/${id}/feedback?${params.toString()}`);
        return data;
    },

    /**
     * Obtiene los filtros disponibles (países y partidas)
     */
    async getFiltros(): Promise<FiltrosBaseResponse> {
        const { data } = await api.get('/contactos/filtros-base');
        return data;
    },

    /**
     * Obtiene los casos de llamada disponibles
     */
    async getCasosLlamada(): Promise<CasoLlamada[]> {
        const { data } = await api.get('/casos-llamada');
        return data;
    },

    /**
     * Crea un contacto manual asociado a un RUC
     */
    async crearContactoManual(data: { ruc: string; nombre: string; telefono: string; cargo?: string; email?: string }): Promise<ContactoAsignado> {
        const { data: response } = await api.post('/contactos/manual', data);
        return response;
    }
};
