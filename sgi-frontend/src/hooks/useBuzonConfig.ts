import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

const BASE = '/buzon-config';

export function useBuzonConfig() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['buzon-config'] });

  const resumen = useQuery({
    queryKey: ['buzon-config', 'resumen'],
    queryFn: async () => (await api.get(`${BASE}/resumen`)).data,
  });

  const toggleDisponibilidad = useMutation({
    mutationFn: (id: number) => api.patch(`${BASE}/disponibilidad/${id}/toggle`),
    onSuccess: invalidate,
  });

  const motivos = useQuery({
    queryKey: ['buzon-config', 'motivos'],
    queryFn: async () => (await api.get(`${BASE}/motivos-descarte`)).data,
  });

  const createMotivo = useMutation({
    mutationFn: (nombre: string) => api.post(`${BASE}/motivos-descarte`, { nombre }),
    onSuccess: invalidate,
  });

  const updateMotivo = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      api.put(`${BASE}/motivos-descarte/${id}`, { nombre }),
    onSuccess: invalidate,
  });

  const toggleMotivo = useMutation({
    mutationFn: (id: number) => api.patch(`${BASE}/motivos-descarte/${id}/toggle`),
    onSuccess: invalidate,
  });

  const horario = useQuery({
    queryKey: ['buzon-config', 'horario'],
    queryFn: async () => (await api.get(`${BASE}/horario`)).data,
  });

  const setHorario = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`${BASE}/horario`, { horario: data }),
    onSuccess: invalidate,
  });

  const sla = useQuery({
    queryKey: ['buzon-config', 'sla'],
    queryFn: async () => (await api.get(`${BASE}/sla`)).data,
  });

  const setSla = useMutation({
    mutationFn: (data: { primera_respuesta_min: number; resolucion_horas: number }) =>
      api.put(`${BASE}/sla`, data),
    onSuccess: invalidate,
  });

  const diasNoLab = useQuery({
    queryKey: ['buzon-config', 'dias'],
    queryFn: async () => (await api.get(`${BASE}/dias-no-laborables`)).data,
  });

  const addDia = useMutation({
    mutationFn: (data: { fecha: string; descripcion?: string }) =>
      api.post(`${BASE}/dias-no-laborables`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buzon-config', 'dias'] }),
  });

  const removeDia = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/dias-no-laborables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buzon-config', 'dias'] }),
  });

  const mensajes = useQuery({
    queryKey: ['buzon-config', 'mensajes'],
    queryFn: async () => (await api.get(`${BASE}/mensajes`)).data,
  });

  const setMensajes = useMutation({
    mutationFn: (data: Record<string, string>) => api.put(`${BASE}/mensajes`, { mensajes: data }),
    onSuccess: invalidate,
  });

  const keywords = useQuery({
    queryKey: ['buzon-config', 'keywords'],
    queryFn: async () => (await api.get(`${BASE}/keywords`)).data,
  });

  const setKeywords = useMutation({
    mutationFn: (data: Record<string, string[]>) => api.put(`${BASE}/keywords`, { keywords: data }),
    onSuccess: invalidate,
  });

  return {
    resumen, toggleDisponibilidad,
    motivos, createMotivo, updateMotivo, toggleMotivo,
    horario, setHorario, sla, setSla,
    diasNoLab, addDia, removeDia,
    mensajes, setMensajes, keywords, setKeywords,
  };
}
