import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DepartamentoGeo, Provincia, Distrito } from '@/types/core/ubigeo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const UBIGEO_URL = `${API_BASE_URL}/ubigeo`;

// ============================================
// HOOK PARA DEPARTAMENTOS GEOGRÁFICOS
// ============================================
export const useDepartamentosGeo = () => {
    return useQuery({
        queryKey: ['ubigeo', 'departamentos'],
        queryFn: async () => {
            const { data } = await axios.get<DepartamentoGeo[]>(`${UBIGEO_URL}/departamentos`);
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
            const { data } = await axios.get<Provincia[]>(`${UBIGEO_URL}/provincias`, { params });
            return data;
        },
        enabled: !!departamentoId, // Solo ejecuta si hay departamentoId
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
            const { data } = await axios.get<Distrito[]>(`${UBIGEO_URL}/distritos`, { params });
            return data;
        },
        enabled: !!provinciaId, // Solo ejecuta si hay provinciaId
        staleTime: 1000 * 60 * 30,
    });
};
