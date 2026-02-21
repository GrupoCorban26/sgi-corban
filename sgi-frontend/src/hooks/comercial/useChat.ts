import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    ChatConversationPreview,
    ChatMessage,
    SendMessageRequest,
    ChangeEstadoRequest
} from '@/types/chat';

const CHAT_URL = '/comercial/chat';

export const useChatConversations = () => {
    return useQuery({
        queryKey: ['chat-conversations'],
        queryFn: async () => {
            const { data } = await api.get<ChatConversationPreview[]>(`${CHAT_URL}/conversations`);
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
        onSuccess: (_, variables) => {
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

    return {
        sendMessage,
        takeChat,
        releaseChat,
        changeEstado,
        markAsRead
    };
};
