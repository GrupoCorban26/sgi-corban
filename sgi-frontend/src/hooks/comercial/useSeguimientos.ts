import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
    Seguimiento,
    SeguimientoCreate,
    CotizacionItemCreate,
    CotizacionItem,
    CotizacionCerrar,
    SeguimientoCaer,
    SeguimientoMover,
    SeguimientoComentario,
    SeguimientoHistorial,
    SeguimientoCatalogos,
    SeguimientoOperar,
    SeguimientoEntregar,
    DocumentoToggle,
    SeguimientoDocumento,
    DocumentoOperacional
} from '@/types/seguimiento';

const SEGUIMIENTOS_URL = '/seguimientos';

// ============================================
// HOOK DE KANBAN (SEGUIMIENTOS)
// ============================================
export const useSeguimientos = (comercialId: number | null = null) => {
    const queryClient = useQueryClient();

    // 1. Obtener listado de seguimientos
    const listQuery = useQuery({
        queryKey: ['seguimientos', comercialId],
        queryFn: async () => {
            const params: Record<string, unknown> = {};
            if (comercialId !== null && comercialId !== undefined) {
                params.comercial_id = comercialId;
            }
            const { data } = await api.get<Seguimiento[]>(`${SEGUIMIENTOS_URL}`, { params });
            return data;
        }
    });

    // 2. Obtener catálogos necesarios (incluye documentos_operacionales)
    const catalogosQuery = useQuery({
        queryKey: ['seguimientos-catalogos'],
        queryFn: async () => {
            const { data } = await api.get<SeguimientoCatalogos>(`${SEGUIMIENTOS_URL}/catalogos`);
            return data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutos
    });

    // 3. Crear Seguimiento (tarjeta)
    const createMutation = useMutation({
        mutationFn: async (newSeg: SeguimientoCreate) => {
            const { data } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}`, newSeg);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] }); // Para actualizar indicadores de cartera
        }
    });

    // 4. Agregar Cotización Item
    const agregarCotizacionMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CotizacionItemCreate }) => {
            const { data: response } = await api.post<CotizacionItem>(`${SEGUIMIENTOS_URL}/${id}/cotizaciones`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
        }
    });

    // 5. Mover tarjeta
    const moverTarjetaMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: SeguimientoMover }) => {
            const { data: response } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}/mover`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
        }
    });

    // 6. Cerrar seguimiento (aceptar cotización)
    const cerrarSeguimientoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: CotizacionCerrar }) => {
            const { data: response } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}/cerrar`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        }
    });

    // 7. Caer seguimiento (negociación perdida)
    const caerSeguimientoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: SeguimientoCaer }) => {
            const { data: response } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}/caer`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        }
    });

    // 8. Registrar gestión/comentario
    const registrarComentarioMutation = useMutation({
        mutationFn: async ({ id, comentario, medioGestionId }: { id: number; comentario: string; medioGestionId?: number }) => {
            const payload = { comentario, medio_gestion_id: medioGestionId };
            const { data } = await api.post<SeguimientoComentario>(`${SEGUIMIENTOS_URL}/${id}/comentarios`, payload);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimiento-comentarios', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
        }
    });

    // 9. Operar seguimiento (CERRADO → EN_OPERACION)
    const operarSeguimientoMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: SeguimientoOperar }) => {
            const { data: response } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}/operar`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
        }
    });

    // 10. Entregar carga (EN_OPERACION → CARGA_ENTREGADA)
    const entregarCargaMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: SeguimientoEntregar }) => {
            const { data: response } = await api.post<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}/entregar`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
        }
    });

    // 11. Toggle documento operacional (completado/pendiente)
    const toggleDocumentoMutation = useMutation({
        mutationFn: async ({ id, docRelId, data }: { id: number; docRelId: number; data: DocumentoToggle }) => {
            const { data: response } = await api.patch<SeguimientoDocumento>(
                `${SEGUIMIENTOS_URL}/${id}/documentos/${docRelId}/toggle`,
                data
            );
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['seguimiento', variables.id] });
        }
    });

    return {
        listQuery,
        catalogosQuery,
        seguimientos: listQuery.data || [],
        isLoading: listQuery.isLoading || catalogosQuery.isLoading,
        isError: listQuery.isError,
        catalogos: catalogosQuery.data,
        createMutation,
        agregarCotizacionMutation,
        moverTarjetaMutation,
        cerrarSeguimientoMutation,
        caerSeguimientoMutation,
        registrarComentarioMutation,
        operarSeguimientoMutation,
        entregarCargaMutation,
        toggleDocumentoMutation
    };
};

// ============================================
// HOOKS INDIVIDUALES DETALLE
// ============================================
export const useSeguimientoDetalle = (id: number | null) => {
    return useQuery({
        queryKey: ['seguimiento', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<Seguimiento>(`${SEGUIMIENTOS_URL}/${id}`);
            return data;
        },
        enabled: !!id
    });
};

export const useSeguimientoComentarios = (id: number | null) => {
    return useQuery({
        queryKey: ['seguimiento-comentarios', id],
        queryFn: async () => {
            if (!id) return [];
            const { data } = await api.get<SeguimientoComentario[]>(`${SEGUIMIENTOS_URL}/${id}/comentarios`);
            return data;
        },
        enabled: !!id
    });
};

export const useSeguimientoHistorial = (id: number | null) => {
    return useQuery({
        queryKey: ['seguimiento-historial', id],
        queryFn: async () => {
            if (!id) return [];
            const { data } = await api.get<SeguimientoHistorial[]>(`${SEGUIMIENTOS_URL}/${id}/historial`);
            return data;
        },
        enabled: !!id
    });
};
