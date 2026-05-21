/**
 * Servicio de Base Comercial - Migrado a endpoints /base/*
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
     * Endpoint: GET /api/v1/base/mis-contactos
     */
    async getMisContactos(): Promise<ContactoAsignado[]> {
        const { data } = await api.get('/base/mis-contactos');
        return data;
    },

    /**
     * Carga 50 contactos nuevos de la base filtrada
     * Endpoint: POST /api/v1/base/cargar
     */
    async cargarBase(empresa?: string): Promise<CargarBaseResponse> {
        const params: Record<string, string> = {};
        if (empresa) {
            params.empresa = empresa;
        }
        const { data } = await api.post('/base/cargar', null, { params });
        return data;
    },

    /**
     * Actualiza el feedback de un contacto (caso + comentario)
     * Endpoint: POST /api/v1/base/{base_id}/feedback
     */
    async actualizarFeedback(baseId: number, casoId: number, comentario: string): Promise<FeedbackResponse> {
        const params = new URLSearchParams({
            caso_id: casoId.toString(),
            comentario
        });
        const { data } = await api.post(`/base/${baseId}/feedback?${params.toString()}`);
        return data;
    },

    /**
     * Envía el feedback completo del lote y libera los contactos
     * Endpoint: POST /api/v1/base/enviar-feedback
     */
    async enviarFeedbackLote(): Promise<{ success: boolean; mensaje: string }> {
        const { data } = await api.post('/base/enviar-feedback');
        return data;
    },

    /**
     * Obtiene los filtros disponibles (países y partidas)
     * Endpoint: GET /api/v1/contactos/filtros-base  (aún en fachada)
     */
    async getFiltros(): Promise<FiltrosBaseResponse> {
        const { data } = await api.get('/contactos/filtros-base');
        return data;
    },

    /**
     * Obtiene los casos de llamada disponibles
     * Endpoint: GET /api/v1/casos-llamada
     */
    async getCasosLlamada(): Promise<CasoLlamada[]> {
        const { data } = await api.get('/casos-llamada');
        return data;
    },

    /**
     * Crea un contacto manual asociado a un RUC.
     * Si crearComoProspecto=true, también crea un Cliente en cartera.
     * Endpoint: POST /api/v1/contactos/manual  (aún en fachada)
     */
    async crearContactoManual(payload: {
        ruc: string;
        nombre?: string;
        telefono?: string;
        cargo?: string;
        email?: string;
        crear_como_prospecto?: boolean;
    }): Promise<ContactoAsignado & { actualizado?: boolean; prospecto_creado?: boolean; cliente_ya_existia?: boolean }> {
        const { data: response } = await api.post('/contactos/manual', payload);
        return response;
    }
};
