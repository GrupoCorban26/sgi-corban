import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsWebService } from '@/services/comercial/leads-web';
import { LeadWebFiltros, LeadWebDescartarRequest, LeadWebConvertirRequest } from '@/types/lead-web';

const QUERY_KEY = 'leads-web';

export const useLeadsWeb = (filtros?: LeadWebFiltros) => {
    const queryClient = useQueryClient();

    // Listar leads
    const leadsQuery = useQuery({
        queryKey: [QUERY_KEY, filtros],
        queryFn: () => leadsWebService.listar(filtros),
    });

    // Contar pendientes
    const conteoQuery = useQuery({
        queryKey: [QUERY_KEY, 'count'],
        queryFn: () => leadsWebService.contarPendientes(),
    });

    // Cambiar estado
    const cambiarEstadoMutation = useMutation({
        mutationFn: ({ id, estado, notas }: { id: number; estado: string; notas?: string }) =>
            leadsWebService.cambiarEstado(id, estado, notas),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    // Descartar
    const descartarMutation = useMutation({
        mutationFn: ({ id, request }: { id: number; request: LeadWebDescartarRequest }) =>
            leadsWebService.descartar(id, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    // Convertir
    const convertirMutation = useMutation({
        mutationFn: ({ id, request }: { id: number; request: LeadWebConvertirRequest }) =>
            leadsWebService.convertir(id, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    // Actualizar notas
    const actualizarNotasMutation = useMutation({
        mutationFn: ({ id, notas }: { id: number; notas: string }) =>
            leadsWebService.actualizarNotas(id, notas),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    // Asignar manual
    const asignarManualMutation = useMutation({
        mutationFn: ({ id, comercialId }: { id: number; comercialId: number }) =>
            leadsWebService.asignarManual(id, comercialId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    return {
        leads: leadsQuery.data || [],
        isLoading: leadsQuery.isLoading,
        isError: leadsQuery.isError,
        refetch: leadsQuery.refetch,
        pendientes: conteoQuery.data || 0,
        cambiarEstadoMutation,
        descartarMutation,
        convertirMutation,
        actualizarNotasMutation,
        asignarManualMutation,
    };
};
