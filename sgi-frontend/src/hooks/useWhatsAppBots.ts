import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

const BASE = '/whatsapp-bots';

export interface BotConfig {
  id: number;
  slug: string;
  nombre_bot: string;
  jefe_comercial_id: number;
  jefe_nombre: string | null;
  whatsapp_phone_id: string;
  whatsapp_token_masked: string;
  whatsapp_verify_token: string;
  is_active: boolean;
  webhook_url: string;
}

export interface BotConfigCreate {
  slug: string;
  nombre_bot: string;
  jefe_comercial_id: number;
  whatsapp_token: string;
  whatsapp_phone_id: string;
  whatsapp_verify_token: string;
}

export interface BotConfigUpdate {
  slug?: string;
  nombre_bot?: string;
  jefe_comercial_id?: number;
  whatsapp_token?: string;
  whatsapp_phone_id?: string;
  whatsapp_verify_token?: string;
}

export interface JefeOption {
  id: number;
  nombre: string;
}

export function useWhatsAppBots() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['whatsapp-bots'] });

  const bots = useQuery<BotConfig[]>({
    queryKey: ['whatsapp-bots'],
    queryFn: async () => (await api.get(BASE)).data,
  });

  const jefes = useQuery<JefeOption[]>({
    queryKey: ['whatsapp-bots', 'jefes'],
    queryFn: async () => (await api.get(`${BASE}/jefes/disponibles`)).data,
  });

  const createBot = useMutation({
    mutationFn: (data: BotConfigCreate) => api.post(BASE, data),
    onSuccess: invalidate,
  });

  const updateBot = useMutation({
    mutationFn: ({ id, ...data }: BotConfigUpdate & { id: number }) =>
      api.put(`${BASE}/${id}`, data),
    onSuccess: invalidate,
  });

  const toggleBot = useMutation({
    mutationFn: (id: number) => api.patch(`${BASE}/${id}/toggle`),
    onSuccess: invalidate,
  });

  return { bots, jefes, createBot, updateBot, toggleBot };
}
