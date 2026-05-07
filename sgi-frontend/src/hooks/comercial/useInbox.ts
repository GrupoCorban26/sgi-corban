import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { InboxLead } from '@/types/inbox';

const INBOX_URL = '/comercial/inbox';

export const useInbox = (role?: string, filtroComercialId?: number | '') => {
    const queryClient = useQueryClient();
    const isJefa = role === 'jefa_comercial';
    const endpoint = isJefa ? `${INBOX_URL}/all-leads` : `${INBOX_URL}/my-leads`;

    // 1. Get Leads (My Leads or All Leads)
    const inboxQuery = useQuery({
        queryKey: ['inbox-leads', role, filtroComercialId],
        queryFn: async () => {
            const params: Record<string, any> = {};
            if (isJefa && filtroComercialId) {
                params.filtro_comercial_id = filtroComercialId;
            }
            const { data } = await api.get<InboxLead[]>(endpoint, { params });
            return data;
        },
    });

    // 2. Convert Lead (After creating client)
    const convertMutation = useMutation({
        mutationFn: async ({ id, clienteId }: { id: number; clienteId: number }) => {
            const { data } = await api.post(`${INBOX_URL}/${id}/convertir`, null, {
                params: { cliente_id: clienteId }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbox-leads'] });
            queryClient.invalidateQueries({ queryKey: ['inbox', 'count'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-stats'] });
        },
    });

    // 3. Discard Lead
    const discardMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: { motivo_descarte_id: number; comentario_descarte: string; enviar_mensaje?: boolean } }) => {
            const { data: res } = await api.post(`${INBOX_URL}/${id}/descartar`, data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbox-leads'] });
            queryClient.invalidateQueries({ queryKey: ['inbox', 'count'] });
        },
    });

    // 4. Asignar Manual
    const asignarManualMutation = useMutation({
        mutationFn: async ({ id, comercialId }: { id: number; comercialId: number }) => {
            const { data } = await api.post(`${INBOX_URL}/${id}/asignar-manual`, {
                comercial_id: comercialId
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbox-leads'] });
            queryClient.invalidateQueries({ queryKey: ['inbox', 'count'] });
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        },
    });

    return {
        leads: inboxQuery.data || [],
        isLoading: inboxQuery.isLoading,
        isError: inboxQuery.isError,
        refetch: inboxQuery.refetch,
        convertMutation,
        discardMutation,
        asignarManualMutation
    };
};
