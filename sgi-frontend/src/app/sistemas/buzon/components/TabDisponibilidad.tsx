'use client';

import { ToggleLeft, ToggleRight, Inbox, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBuzonConfig } from '@/hooks/useBuzonConfig';

interface Comercial {
  usuario_id: number;
  nombre: string;
  disponible_buzon: boolean;
  leads_pendientes: number;
}

export default function TabDisponibilidad() {
  const { resumen, toggleDisponibilidad } = useBuzonConfig();
  const data: Comercial[] = resumen.data?.disponibilidad || [];
  const loading = resumen.isLoading;

  const handleToggle = async (id: number, nombre: string) => {
    try {
      await toggleDisponibilidad.mutateAsync(id);
      toast.success(`Disponibilidad de ${nombre} actualizada`);
    } catch {
      toast.error('Error al cambiar disponibilidad');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-azul-500" size={28} />
      </div>
    );
  }

  const disponibles = data.filter(d => d.disponible_buzon).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{disponibles}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total comerciales</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{data.length}</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comerciales activos</p>
        </div>
        <div className="divide-y divide-gray-100">
          {data.map(c => (
            <div key={c.usuario_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${c.disponible_buzon ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Inbox size={12} />
                    <span>{c.leads_pendientes} leads pendientes</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleToggle(c.usuario_id, c.nombre)}
                disabled={toggleDisponibilidad.isPending}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title={c.disponible_buzon ? 'Desactivar' : 'Activar'}
              >
                {c.disponible_buzon
                  ? <ToggleRight size={28} className="text-emerald-500" />
                  : <ToggleLeft size={28} className="text-gray-300" />
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
