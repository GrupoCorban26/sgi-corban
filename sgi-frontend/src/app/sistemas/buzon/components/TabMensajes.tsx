'use client';

import { useState, useEffect } from 'react';
import { Save, MessageCircle, Tag, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useBuzonConfig } from '@/hooks/useBuzonConfig';

const MSG_LABELS: Record<string, { label: string; vars?: string }> = {
  bienvenida: { label: 'Bienvenida' },
  menu_regreso: { label: 'Menú de regreso' },
  asesor_asignado: { label: 'Asesor asignado', vars: '{nombre}' },
  asesor_asignado_fuera_horario: { label: 'Asesor asignado (fuera horario)', vars: '{nombre}, {horario}' },
  asesor_existente: { label: 'Asesor existente', vars: '{nombre}' },
  cotizar_pedir_req: { label: 'Cotizar: pedir requerimientos' },
  cotizar_confirmar: { label: 'Cotizar: confirmar' },
  cotizar_derivado: { label: 'Cotizar: derivado', vars: '{nombre}' },
  carga_lista_asignado: { label: 'Carga lista: asignado', vars: '{nombre}' },
  despedida: { label: 'Despedida' },
  horario_info: { label: 'Info de horario' },
  error_ocupados: { label: 'Error: todos ocupados' },
};

export default function TabMensajes() {
  const { mensajes, setMensajes, keywords, setKeywords } = useBuzonConfig();
  const [localMsgs, setLocalMsgs] = useState<Record<string, string>>({});
  const [localKw, setLocalKw] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mensajes.data) setLocalMsgs(mensajes.data);
  }, [mensajes.data]);

  useEffect(() => {
    if (keywords.data) {
      const flat: Record<string, string> = {};
      Object.entries(keywords.data).forEach(([k, v]) => {
        flat[k] = (v as string[]).join(', ');
      });
      setLocalKw(flat);
    }
  }, [keywords.data]);

  const handleSaveMsgs = async () => {
    try {
      await setMensajes.mutateAsync(localMsgs);
      toast.success('Mensajes guardados');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleSaveKw = async () => {
    try {
      const parsed: Record<string, string[]> = {};
      Object.entries(localKw).forEach(([k, v]) => {
        parsed[k] = v.split(',').map(s => s.trim()).filter(Boolean);
      });
      await setKeywords.mutateAsync(parsed);
      toast.success('Keywords guardadas');
    } catch {
      toast.error('Error al guardar');
    }
  };

  if (mensajes.isLoading || keywords.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-azul-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-azul-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mensajes del Bot (Corby)</p>
          </div>
          <button onClick={handleSaveMsgs} disabled={setMensajes.isPending}
            className="cursor-pointer px-3 py-1.5 bg-azul-500 text-white rounded-lg text-xs font-semibold hover:bg-azul-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            <Save size={13} /> Guardar mensajes
          </button>
        </div>
        <div className="p-5 space-y-4">
          {Object.entries(MSG_LABELS).map(([key, meta]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{meta.label}</label>
                {meta.vars && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] font-medium">
                    <Info size={10} /> {meta.vars}
                  </span>
                )}
              </div>
              <textarea
                value={localMsgs[key] || ''}
                onChange={e => setLocalMsgs(prev => ({ ...prev, [key]: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-azul-400/50 resize-y"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-naranja-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Keywords de detección</p>
          </div>
          <button onClick={handleSaveKw} disabled={setKeywords.isPending}
            className="cursor-pointer px-3 py-1.5 bg-naranja-500 text-white rounded-lg text-xs font-semibold hover:bg-naranja-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            <Save size={13} /> Guardar keywords
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-400">Separa las palabras clave con comas.</p>
          {Object.entries(localKw).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider capitalize">{key}</label>
              <textarea
                value={val}
                onChange={e => setLocalKw(prev => ({ ...prev, [key]: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-naranja-400/50 resize-y"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
