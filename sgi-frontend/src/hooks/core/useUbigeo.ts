import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { DepartamentoGeo, Provincia, Distrito } from '@/types/core/ubigeo';

// ============================================
// HOOK PARA DEPARTAMENTOS GEOGRÁFICOS
// ============================================
export const useDepartamentosGeo = () => {
    return useQuery({
        queryKey: ['ubigeo', 'departamentos'],
        queryFn: async () => {
            const { data } = await api.get<DepartamentoGeo[]>('/ubigeo/departamentos');
            return data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutos - datos estáticos
    });
};

// ============================================
// HOOK PARA PROVINCIAS (POR DEPARTAMENTO)
// ============================================
export const useProvincias = (departamentoId: number | null) => {
    return useQuery({
        queryKey: ['ubigeo', 'provincias', departamentoId],
        queryFn: async () => {
            const params = departamentoId ? { departamento_id: departamentoId } : {};
            const { data } = await api.get<Provincia[]>('/ubigeo/provincias', { params });
            return data;
        },
        enabled: !!departamentoId,
        staleTime: 1000 * 60 * 30,
    });
};

// ============================================
// HOOK PARA DISTRITOS (POR PROVINCIA)
// ============================================
export const useDistritos = (provinciaId: number | null) => {
    return useQuery({
        queryKey: ['ubigeo', 'distritos', provinciaId],
        queryFn: async () => {
            const params = provinciaId ? { provincia_id: provinciaId } : {};
            const { data } = await api.get<Distrito[]>('/ubigeo/distritos', { params });
            return data;
        },
        enabled: !!provinciaId,
        staleTime: 1000 * 60 * 30,
    });
};
