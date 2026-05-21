/**
 * Servicio de Lotes de Prospección - Endpoints /lotes/*
 * Gestión de lotes para carga masiva de contactos de prospección.
 * 
 * Reemplaza a los endpoints legacy de contactosService (getLotes, uploadToLote, etc.)
 */
import api from '@/lib/axios';
import { Lote } from '@/types/contactos';

export interface LoteUploadResponse {
    message: string;
    lote_id: number;
    lote_nombre: string;
    total_insertados: number;
    total_duplicados: number;
    total_procesados: number;
}

export const lotesService = {
    /**
     * Lista todos los lotes con estadísticas
     * Endpoint: GET /api/v1/lotes
     */
    getLotes: async (): Promise<Lote[]> => {
        const { data } = await api.get('/lotes');
        return data;
    },

    /**
     * Activa/desactiva un lote (DISPONIBLE / FINALIZADO)
     * Endpoint: PATCH /api/v1/lotes/{loteId}/estado
     */
    toggleLote: async (loteId: number): Promise<{ success: boolean; estado: string; message: string }> => {
        const { data } = await api.patch(`/lotes/${loteId}/estado`);
        return data;
    },

    /**
     * Sube un Excel de contactos y crea un lote + registros en bases
     * Endpoint: POST /api/v1/lotes/upload
     */
    uploadLote: async (file: File, empresa?: string): Promise<LoteUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        if (empresa) {
            formData.append('empresa', empresa);
        }
        const { data } = await api.post('/lotes/upload', formData);
        return data;
    },

    /**
     * Descarga un lote con la información cruzada de llamadas
     * Endpoint: GET /api/v1/lotes/{loteId}/download
     */
    downloadLote: async (loteId: number): Promise<Blob> => {
        const { data } = await api.get(`/lotes/${loteId}/download`, {
            responseType: 'blob'
        });
        return data;
    },
};
