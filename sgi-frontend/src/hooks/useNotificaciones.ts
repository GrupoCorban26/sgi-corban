'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Notificacion {
    id: number;
    tipo: string;
    titulo: string;
    mensaje: string | null;
    leida: boolean;
    url_destino: string | null;
    created_at: string;
}

interface NotificacionesResponse {
    no_leidas: number;
    notificaciones: Notificacion[];
}

// Hook para obtener el conteo de notificaciones no leídas (polling cada 30s)
export const useNotificacionesCount = () => {
    return useQuery<{ no_leidas: number }>({
        queryKey: ['notificaciones', 'count'],
        queryFn: async () => {
            const { data } = await api.get('/comercial/notificaciones/count');
            return data;
        },
        refetchInterval: 30000, // Polling cada 30 segundos
        refetchIntervalInBackground: false, // No hacer polling si la pestaña no está activa
        staleTime: 15000,
    });
};

// Hook para obtener la lista de notificaciones
export const useNotificaciones = () => {
    return useQuery<NotificacionesResponse>({
        queryKey: ['notificaciones', 'lista'],
        queryFn: async () => {
            const { data } = await api.get('/comercial/notificaciones/');
            return data;
        },
        staleTime: 10000,
    });
};

// Hook con las acciones de notificaciones
export const useNotificacionesActions = () => {
    const queryClient = useQueryClient();

    const marcarLeida = useMutation({
        mutationFn: async (notificacionId: number) => {
            const { data } = await api.post(`/comercial/notificaciones/${notificacionId}/leer`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
        },
    });

    const marcarTodasLeidas = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/comercial/notificaciones/leer-todas');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
        },
    });

    return { marcarLeida, marcarTodasLeidas };
};
