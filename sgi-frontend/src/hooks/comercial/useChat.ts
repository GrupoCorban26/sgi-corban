import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    ChatConversationPreview,
    ChatMessage,
    SendMessageRequest,
    ChangeEstadoRequest
} from '@/types/chat';

const CHAT_URL = '/comercial/chat';

export const useChatConversations = (filtroComercialId?: number | '') => {
    return useQuery({
        queryKey: ['chat-conversations', filtroComercialId],
        queryFn: async () => {
            const params: Record<string, any> = {};
            if (filtroComercialId) {
                params.filtro_comercial_id = filtroComercialId;
            }
            const { data } = await api.get<ChatConversationPreview[]>(`${CHAT_URL}/conversations`, { params });
            return data;
        },
        refetchInterval: 10000, // Polling every 10s
    });
};

export const useChatMessages = (inboxId: number | null) => {
    return useQuery({
        queryKey: ['chat-messages', inboxId],
        queryFn: async () => {
            if (!inboxId) return [];
            const { data } = await api.get<ChatMessage[]>(`${CHAT_URL}/${inboxId}/messages`);
            return data;
        },
        enabled: !!inboxId,
        refetchInterval: 5000, // Faster polling for active chat
    });
};

export const useChatActions = () => {
    const queryClient = useQueryClient();

    const sendMessage = useMutation({
        mutationFn: async ({ inboxId, contenido }: { inboxId: number; contenido: string }) => {
            const req: SendMessageRequest = { contenido };
            const { data } = await api.post(`${CHAT_URL}/${inboxId}/send`, req);
            return data;
        },
        onMutate: async (newMsg) => {
            await queryClient.cancelQueries({ queryKey: ['chat-messages', newMsg.inboxId] });
            const previousMessages = queryClient.getQueryData<ChatMessage[]>(['chat-messages', newMsg.inboxId]);

            // Añadir mensaje fake optimista
            const optimisticMsg: ChatMessage = {
                id: Date.now(),
                inbox_id: newMsg.inboxId,
                telefono: '...',
                direccion: 'SALIENTE',
                remitente_tipo: 'COMERCIAL',
                remitente_id: null,
                contenido: newMsg.contenido,
                tipo_contenido: 'text',
                media_url: null,
                whatsapp_msg_id: null,
                estado_envio: 'ENVIANDO',
                leido: false,
                created_at: new Date().toISOString()
            };

            queryClient.setQueryData<ChatMessage[]>(['chat-messages', newMsg.inboxId], old => [...(old || []), optimisticMsg]);

            return { previousMessages };
        },
        onError: (err, newMsg, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['chat-messages', newMsg.inboxId], context.previousMessages);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.inboxId] });
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        },
    });

    const takeChat = useMutation({
        mutationFn: async (inboxId: number) => {
            const { data } = await api.post(`${CHAT_URL}/${inboxId}/take`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        }
    });

    const releaseChat = useMutation({
        mutationFn: async (inboxId: number) => {
            const { data } = await api.post(`${CHAT_URL}/${inboxId}/release`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        }
    });

    const changeEstado = useMutation({
        mutationFn: async ({ inboxId, nuevo_estado }: { inboxId: number; nuevo_estado: string }) => {
            const req: ChangeEstadoRequest = { nuevo_estado };
            const { data } = await api.patch(`${CHAT_URL}/${inboxId}/estado`, req);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        }
    });

    const markAsRead = useMutation({
        mutationFn: async (inboxId: number) => {
            const { data } = await api.post(`${CHAT_URL}/${inboxId}/mark-read`);
            return data;
        },
        onSuccess: (_, inboxId) => {
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['chat-messages', inboxId] });
        }
    });

    const descartarLead = useMutation({
        mutationFn: async ({ inboxId, request }: { inboxId: number; request: { motivo_descarte: string; comentario_descarte: string } }) => {
            const { data } = await api.post(`/comercial/inbox/${inboxId}/descartar`, request);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        }
    });

    return {
        sendMessage,
        takeChat,
        releaseChat,
        changeEstado,
        markAsRead,
        descartarLead
    };
};
