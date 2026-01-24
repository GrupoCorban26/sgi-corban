import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { baseComercialService } from '@/services/baseComercial';
import { ContactoAsignado } from '@/types/base-comercial';

/**
 * Hook para obtener los contactos asignados al comercial
 */
export function useMisContactos() {
    return useQuery({
        queryKey: ['mis-contactos'],
        queryFn: baseComercialService.getMisContactos,
        staleTime: 30000, // 30 segundos
    });
}

/**
 * Hook para cargar nueva base (50 contactos)
 */
export function useCargarBase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ paisOrigen, partidaArancelaria }: { paisOrigen?: string[]; partidaArancelaria?: string[] }) =>
            baseComercialService.cargarBase(paisOrigen, partidaArancelaria),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mis-contactos'] });
        }
    });
}

/**
 * Hook para actualizar feedback de un contacto
 */
export function useActualizarFeedback() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, casoId, comentario }: { id: number; casoId: number; comentario: string }) =>
            baseComercialService.actualizarFeedback(id, casoId, comentario),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mis-contactos'] });
        }
    });
}



/**
 * Hook para obtener filtros (países y partidas)
 */
export function useFiltrosBase() {
    return useQuery({
        queryKey: ['filtros-base'],
        queryFn: baseComercialService.getFiltros,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook para obtener casos de llamada
 */
export function useCasosLlamada() {
    return useQuery({
        queryKey: ['casos-llamada'],
        queryFn: baseComercialService.getCasosLlamada,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook combinado para la página de base comercial
 */
export function useBaseComercial() {
    const misContactos = useMisContactos();
    const filtros = useFiltrosBase();
    const casos = useCasosLlamada();
    const cargarBaseMutation = useCargarBase();
    const actualizarFeedbackMutation = useActualizarFeedback();

    const contactos = misContactos.data || [];

    // Verificar si todos los contactos tienen feedback completo
    const todosTienenFeedback = contactos.length > 0 &&
        contactos.every((c: ContactoAsignado) => c.caso_id !== null && c.comentario && c.comentario.trim() !== '');

    // Verificar si todos los contactos están guardados (tienen fecha_llamada)
    const todosGuardados = contactos.length > 0 &&
        contactos.every((c: ContactoAsignado) => c.fecha_llamada !== null);

    // Verificar si hay contactos sin guardar
    const tieneContactosSinGuardar = contactos.some((c: ContactoAsignado) => c.fecha_llamada === null);

    return {
        // Data
        contactos,
        filtros: filtros.data || { paises: [], partidas: [] },
        casos: casos.data || [],

        // States
        isLoading: misContactos.isLoading || filtros.isLoading || casos.isLoading,
        isLoadingContactos: misContactos.isLoading,
        isFetching: misContactos.isFetching,
        todosTienenFeedback,
        todosGuardados,
        tieneContactosSinGuardar,
        tieneContactos: contactos.length > 0,

        // Mutations
        cargarBase: cargarBaseMutation.mutateAsync,
        isCargarBaseLoading: cargarBaseMutation.isPending,

        actualizarFeedback: actualizarFeedbackMutation.mutateAsync,
        isActualizandoFeedback: actualizarFeedbackMutation.isPending,

        // Refetch
        refetch: misContactos.refetch
    };
}
