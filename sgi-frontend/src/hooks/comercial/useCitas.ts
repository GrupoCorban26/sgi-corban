import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================
// INTERFACES
// ============================================================

export interface ComercialAsignado {
    id: number;
    usuario_id: number;
    nombre: string;
    confirmado: boolean;
}

export interface Cita {
    id: number;
    tipo_agenda: 'INDIVIDUAL' | 'SALIDA_CAMPO';
    cliente_id?: number;
    comercial_id: number;
    fecha: string;
    hora: string;
    tipo_cita: string;
    direccion: string;
    motivo: string;
    objetivo_campo?: string;
    con_presente: boolean;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'TERMINADO';
    motivo_rechazo?: string;
    acompanado_por_id?: number;
    conductor_id?: number;

    // Expanded
    cliente_razon_social?: string;
    comercial_nombre?: string;
    acompanante_nombre?: string;
    conductor_info?: string;
    comerciales_asignados?: ComercialAsignado[];

    created_at: string;
}

export interface CitaCreate {
    cliente_id: number;
    fecha: string;
    hora: string;
    tipo_cita: string;
    direccion: string;
    motivo: string;
    con_presente: boolean;
}

export interface CitaUpdate {
    fecha?: string;
    hora?: string;
    tipo_cita?: string;
    direccion?: string;
    motivo?: string;
    con_presente?: boolean;
}

export interface SalidaCampoCreate {
    fecha: string;
    hora: string;
    direccion?: string;
    objetivo_campo: string;
    comerciales_ids: number[];
    con_presente: boolean;
}

export interface SalidaCampoUpdate {
    fecha?: string;
    hora?: string;
    direccion?: string;
    objetivo_campo?: string;
    comerciales_ids?: number[];
    con_presente?: boolean;
}

export interface CitaAprobar {
    acompanado_por_id?: number;
    ira_solo?: boolean;
    conductor_id?: number;
}

export interface CitaRechazar {
    motivo_rechazo: string;
}

export interface ComercialDropdown {
    id: number;
    nombre: string;
}

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
    const token = Cookies.get('token');

    const fetchCitas = async () => {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: '20'
        });
        if (comercial_id) params.append('comercial_id', comercial_id.toString());
        if (estado) params.append('estado', estado);
        if (tipo_agenda) params.append('tipo_agenda', tipo_agenda);

        const { data } = await axios.get(`${API_URL}/citas?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    };

    const query = useQuery({
        queryKey: ['citas', comercial_id, estado, tipo_agenda, page],
        queryFn: fetchCitas,
    });

    // Crear cita individual
    const createMutation = useMutation({
        mutationFn: async (newCita: CitaCreate) => {
            const { data } = await axios.post(`${API_URL}/citas`, newCita, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Crear salida a campo
    const createSalidaCampoMutation = useMutation({
        mutationFn: async (data: SalidaCampoCreate) => {
            const { data: response } = await axios.post(`${API_URL}/citas/salida-campo`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Actualizar cita
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CitaUpdate }) => {
            await axios.put(`${API_URL}/citas/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Actualizar salida a campo
    const updateSalidaCampoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: SalidaCampoUpdate }) => {
            await axios.put(`${API_URL}/citas/salida-campo/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Aprobar cita
    const approveMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CitaAprobar }) => {
            await axios.post(`${API_URL}/citas/${id}/aprobar`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Rechazar cita
    const rejectMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CitaRechazar }) => {
            await axios.post(`${API_URL}/citas/${id}/rechazar`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Terminar cita
    const terminateMutation = useMutation({
        mutationFn: async (id: number) => {
            await axios.post(`${API_URL}/citas/${id}/terminar`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
    });

    // Eliminar cita
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await axios.delete(`${API_URL}/citas/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
        }
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
    const token = Cookies.get('token');
    return useQuery({
        queryKey: ['conductores'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/citas/conductores`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data as { id: number, display_label: string, vehiculo: string, placa: string }[];
        }
    });
};

export const useComercialesDropdown = () => {
    const token = Cookies.get('token');
    return useQuery({
        queryKey: ['comerciales-dropdown'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/citas/dropdown/comerciales`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data as ComercialDropdown[];
        }
    });
};
