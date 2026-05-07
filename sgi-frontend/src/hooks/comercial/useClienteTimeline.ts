import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

const CLIENTES_URL = '/clientes';

interface TimelineEvento {
    fecha: string | null;
    accion: string;
    motivo: string;
    estado: string;
    estado_anterior?: string | null;
    comentario: string;
    contacto?: string | null;
}

interface TimelineCliente {
    id: number;
    ruc: string | null;
    razon_social: string;
    origen: string;
    estado_actual: string;
    created_at: string | null;
}

interface TimelineResponse {
    cliente: TimelineCliente;
    eventos: TimelineEvento[];
    error?: string;
}

export const useClienteTimeline = (clienteId: number | null) => {
    return useQuery({
        queryKey: ['cliente-timeline', clienteId],
        queryFn: async () => {
            if (!clienteId) return null;
            const { data } = await api.get<TimelineResponse>(`${CLIENTES_URL}/${clienteId}/timeline`);
            return data;
        },
        enabled: !!clienteId,
    });
};
