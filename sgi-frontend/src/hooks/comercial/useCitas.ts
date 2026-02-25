import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    Cita, CitaCreate, CitaUpdate,
    SalidaCampoCreate, SalidaCampoUpdate,
    CitaAprobar, CitaRechazar,
    ComercialDropdown,
} from '@/types/cita';

// Re-exportar tipos para que los consumidores existentes no se rompan
export type {
    Cita, CitaCreate, CitaUpdate,
    SalidaCampoCreate, SalidaCampoUpdate,
    CitaAprobar, CitaRechazar,
    ComercialDropdown, ComercialAsignado,
} from '@/types/cita';

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export const useCitas = (
    comercial_id?: number,
    estado?: string,
    tipo_agenda?: string,
    page: number = 1
) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['citas', comercial_id, estado, tipo_agenda, page],
        queryFn: async () => {
            const params: Record<string, string> = { page: page.toString(), page_size: '20' };
            if (comercial_id) params.comercial_id = comercial_id.toString();
            if (estado) params.estado = estado;
            if (tipo_agenda) params.tipo_agenda = tipo_agenda;

            const { data } = await api.get('/citas', { params });
            return data;
        },
    });

    const invalidarCitas = () => queryClient.invalidateQueries({ queryKey: ['citas'] });

    // Crear cita individual
    const createMutation = useMutation({
        mutationFn: async (newCita: CitaCreate) => {
            const { data } = await api.post('/citas', newCita);
            return data;
        },
        onSuccess: invalidarCitas,
    });

    // Crear salida a campo
    const createSalidaCampoMutation = useMutation({
        mutationFn: async (payload: SalidaCampoCreate) => {
            const { data } = await api.post('/citas/salida-campo', payload);
            return data;
        },
        onSuccess: invalidarCitas,
    });

    // Actualizar cita
    const updateMutation = useMutation({
        mutationFn: async ({ id, data: payload }: { id: number; data: CitaUpdate }) => {
            await api.put(`/citas/${id}`, payload);
        },
        onSuccess: invalidarCitas,
    });

    // Actualizar salida a campo
    const updateSalidaCampoMutation = useMutation({
        mutationFn: async ({ id, data: payload }: { id: number; data: SalidaCampoUpdate }) => {
            await api.put(`/citas/salida-campo/${id}`, payload);
        },
        onSuccess: invalidarCitas,
    });

    // Aprobar cita
    const approveMutation = useMutation({
        mutationFn: async ({ id, data: payload }: { id: number; data: CitaAprobar }) => {
            await api.post(`/citas/${id}/aprobar`, payload);
        },
        onSuccess: invalidarCitas,
    });

    // Rechazar cita
    const rejectMutation = useMutation({
        mutationFn: async ({ id, data: payload }: { id: number; data: CitaRechazar }) => {
            await api.post(`/citas/${id}/rechazar`, payload);
        },
        onSuccess: invalidarCitas,
    });

    // Terminar cita
    const terminateMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.post(`/citas/${id}/terminar`, {});
        },
        onSuccess: invalidarCitas,
    });

    // Eliminar cita
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/citas/${id}`);
        },
        onSuccess: invalidarCitas,
    });

    return {
        citas: query.data?.data || [] as Cita[],
        total: query.data?.total || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        createMutation,
        createSalidaCampoMutation,
        updateMutation,
        updateSalidaCampoMutation,
        approveMutation,
        rejectMutation,
        terminateMutation,
        deleteMutation
    };
};

// ============================================================
// HOOKS AUXILIARES
// ============================================================

export const useConductores = () => {
    return useQuery({
        queryKey: ['conductores'],
        queryFn: async () => {
            const { data } = await api.get('/citas/conductores');
            return data as { id: number, display_label: string, vehiculo: string, placa: string }[];
        }
    });
};

export const useComercialesDropdown = () => {
    return useQuery({
        queryKey: ['comerciales-dropdown'],
        queryFn: async () => {
            const { data } = await api.get('/citas/dropdown/comerciales');
            return data as ComercialDropdown[];
        }
    });
};

export const useSubordinadosDropdown = () => {
    return useQuery({
        queryKey: ['subordinados-dropdown'],
        queryFn: async () => {
            const { data } = await api.get('/citas/dropdown/subordinados');
            return data as ComercialDropdown[];
        }
    });
};
