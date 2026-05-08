import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    EvoInstancia,
    EvoInstanciaQR,
    EvoConversacionList,
    EvoMensajeList,
} from '@/types/supervision';

const BASE_URL = '/comercial/supervision';

// ─────────────────────────────────────────────
// Mi Instancia (Vista del Comercial)
// ─────────────────────────────────────────────

export const useMiInstancia = () => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['supervision', 'mi-instancia'],
        queryFn: async () => {
            const { data } = await api.get(`${BASE_URL}/mi-instancia`);
            return data as EvoInstancia | null;
        },
        refetchInterval: 10000,
    });

    const crearMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post(`${BASE_URL}/mi-instancia`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supervision', 'mi-instancia'] });
        },
    });

    return {
        instancia: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        crearMutation,
    };
};

export const useMiInstanciaQR = (enabled: boolean) => {
    return useQuery({
        queryKey: ['supervision', 'mi-instancia-qr'],
        queryFn: async () => {
            const { data } = await api.get<EvoInstanciaQR>(`${BASE_URL}/mi-instancia/qr`);
            return data;
        },
        enabled,
        refetchInterval: 10000,
    });
};

// ─────────────────────────────────────────────
// Instancias del equipo (Vista del Jefe)
// ─────────────────────────────────────────────

export const useInstancias = () => {
    const queryClient = useQueryClient();

    const instanciasQuery = useQuery({
        queryKey: ['supervision', 'instancias'],
        queryFn: async () => {
            const { data } = await api.get<EvoInstancia[]>(`${BASE_URL}/instancias`);
            return data;
        },
        refetchInterval: 15000,
    });

    const crearMutation = useMutation({
        mutationFn: async (usuario_id: number) => {
            const { data } = await api.post(`${BASE_URL}/instancias`, { usuario_id });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supervision', 'instancias'] });
        },
    });

    const eliminarMutation = useMutation({
        mutationFn: async (instancia_id: number) => {
            const { data } = await api.delete(`${BASE_URL}/instancias/${instancia_id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supervision', 'instancias'] });
        },
    });

    return {
        instancias: instanciasQuery.data || [],
        isLoading: instanciasQuery.isLoading,
        isError: instanciasQuery.isError,
        refetch: instanciasQuery.refetch,
        crearMutation,
        eliminarMutation,
    };
};

// ─────────────────────────────────────────────
// QR Code de una instancia específica
// ─────────────────────────────────────────────

export const useInstanciaQR = (instanciaId: number | null) => {
    return useQuery({
        queryKey: ['supervision', 'qr', instanciaId],
        queryFn: async () => {
            const { data } = await api.get<EvoInstanciaQR>(
                `${BASE_URL}/instancias/${instanciaId}/qr`
            );
            return data;
        },
        enabled: !!instanciaId,
        refetchInterval: 10000,
    });
};

// ─────────────────────────────────────────────
// Conversaciones
// ─────────────────────────────────────────────

export const useConversaciones = (instanciaId: number | null, page: number = 1) => {
    return useQuery({
        queryKey: ['supervision', 'conversaciones', instanciaId, page],
        queryFn: async () => {
            const { data } = await api.get<EvoConversacionList>(
                `${BASE_URL}/instancias/${instanciaId}/conversaciones`,
                { params: { page, page_size: 50 } }
            );
            return data;
        },
        enabled: !!instanciaId,
        refetchInterval: 20000,
    });
};

// ─────────────────────────────────────────────
// Mensajes
// ─────────────────────────────────────────────

export const useMensajes = (conversacionId: number | null, page: number = 1) => {
    return useQuery({
        queryKey: ['supervision', 'mensajes', conversacionId, page],
        queryFn: async () => {
            const { data } = await api.get<EvoMensajeList>(
                `${BASE_URL}/conversaciones/${conversacionId}/mensajes`,
                { params: { page, page_size: 100 } }
            );
            return data;
        },
        enabled: !!conversacionId,
        refetchInterval: 10000,
    });
};
