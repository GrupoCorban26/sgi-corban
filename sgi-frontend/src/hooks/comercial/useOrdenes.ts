import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ============================================
// TYPES
// ============================================
export interface OrdenItem {
    id: number;
    numero_base: number;
    empresa_origen: string;
    codigo_sispac: string | null;
    codigo_sintad: string | null;
    nro_orden_sintad: string | null;
    fecha_ingreso: string | null;
    tipo_servicio: string;
    consignatario: string | null;
    comercial_iniciales: string | null;
    comercial_nombre: string | null;
    estado_sispac: string | null;
    estado_sintad: string | null;
    es_casa: boolean;
    periodo: string;
}

export interface OrdenesListResponse {
    data: OrdenItem[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface ImportResult {
    total_filas: number;
    nuevas: number;
    actualizadas: number;
    errores: number;
    detalle_errores: string[];
}

export interface ResumenComercial {
    comercial_id: number | null;
    comercial_nombre: string;
    comercial_iniciales: string | null;
    total_ordenes: number;
    ordenes_carga: number;
    ordenes_aduanas: number;
    ordenes_integral: number;
    meta: number;
    porcentaje_meta: number;
}

export interface ResumenPeriodo {
    periodo: string;
    total_ordenes: number;
    total_sin_casa: number;
    por_tipo_servicio: Record<string, number>;
    por_empresa: Record<string, number>;
    comerciales: ResumenComercial[];
}

// ============================================
// HOOKS
// ============================================
const ORDENES_URL = '/comercial/ordenes';

export function useOrdenes(
    periodo?: string,
    empresa?: string,
    comercialId?: number,
    page = 1,
    pageSize = 50,
) {
    const params = new URLSearchParams();
    if (periodo) params.set('periodo', periodo);
    if (empresa) params.set('empresa', empresa);
    if (comercialId) params.set('comercial_id', String(comercialId));
    params.set('page', String(page));
    params.set('page_size', String(pageSize));

    return useQuery<OrdenesListResponse>({
        queryKey: ['ordenes', periodo, empresa, comercialId, page],
        queryFn: async () => {
            const { data } = await api.get(`${ORDENES_URL}/listado?${params.toString()}`);
            return data;
        },
    });
}

export function useResumenOrdenes(periodo: string) {
    return useQuery<ResumenPeriodo>({
        queryKey: ['ordenes-resumen', periodo],
        queryFn: async () => {
            const { data } = await api.get(`${ORDENES_URL}/resumen?periodo=${periodo}`);
            return data;
        },
        enabled: !!periodo,
    });
}

export function useImportarSispac() {
    const queryClient = useQueryClient();

    return useMutation<ImportResult, Error, { file: File; empresa: string }>({
        mutationFn: async ({ file, empresa }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('empresa', empresa);
            const { data } = await api.post(`${ORDENES_URL}/importar-sispac`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordenes'] });
            queryClient.invalidateQueries({ queryKey: ['ordenes-resumen'] });
        },
    });
}

export function useImportarSintad() {
    const queryClient = useQueryClient();

    return useMutation<ImportResult, Error, File>({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post(`${ORDENES_URL}/importar-sintad`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordenes'] });
            queryClient.invalidateQueries({ queryKey: ['ordenes-resumen'] });
        },
    });
}
