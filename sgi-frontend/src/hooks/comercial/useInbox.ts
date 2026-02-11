import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { InboxLead } from '@/types/inbox';

const INBOX_URL = '/comercial/inbox';

export const useInbox = (role?: string) => {
    const queryClient = useQueryClient();
    const isJefa = role === 'jefa_comercial';
    const endpoint = isJefa ? `${INBOX_URL}/all-leads` : `${INBOX_URL}/my-leads`;

    // 1. Get Leads (My Leads or All Leads)
    const inboxQuery = useQuery({
        queryKey: ['inbox-leads', role],
        queryFn: async () => {
            const { data } = await api.get<InboxLead[]>(endpoint);
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
        },
    });

    // 3. Discard Lead
    const discardMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`${INBOX_URL}/${id}/descartar`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbox-leads'] });
            queryClient.invalidateQueries({ queryKey: ['inbox', 'count'] });
        },
    });

    return {
        leads: inboxQuery.data || [],
        isLoading: inboxQuery.isLoading,
        isError: inboxQuery.isError,
        refetch: inboxQuery.refetch,
        convertMutation,
        discardMutation
    };
};
