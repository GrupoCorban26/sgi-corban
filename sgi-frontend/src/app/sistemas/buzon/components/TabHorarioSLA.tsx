'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, CalendarOff, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBuzonConfig } from '@/hooks/useBuzonConfig';

const DIAS_SEMANA: Record<string, string> = {
  '0': 'Lunes', '1': 'Martes', '2': 'Miércoles',
  '3': 'Jueves', '4': 'Viernes', '5': 'Sábado',
};

interface Bloque { inicio: string; fin: string; }
interface DiaNoLab { id: number; fecha: string; descripcion: string | null; }

export default function TabHorarioSLA() {
  const { horario, setHorario, sla, setSla, diasNoLab, addDia, removeDia } = useBuzonConfig();

  const [horarioLocal, setHorarioLocal] = useState<Record<string, Bloque[]>>({});
  const [slaResp, setSlaResp] = useState(30);
  const [slaResol, setSlaResol] = useState(24);
  const [newFecha, setNewFecha] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const diasData: DiaNoLab[] = diasNoLab.data || [];

  useEffect(() => {
    if (horario.data) setHorarioLocal(horario.data);
  }, [horario.data]);

  useEffect(() => {
    if (sla.data) {
      setSlaResp(sla.data.primera_respuesta_min);
      setSlaResol(sla.data.resolucion_horas);
    }
  }, [sla.data]);

  const handleSaveHorario = async () => {
    try {
      await setHorario.mutateAsync(horarioLocal);
      toast.success('Horario guardado');
    } catch {
      toast.error('Error al guardar horario');
    }
  };

  const handleSaveSla = async () => {
    try {
      await setSla.mutateAsync({ primera_respuesta_min: slaResp, resolucion_horas: slaResol });
      toast.success('SLA guardado');
    } catch {
      toast.error('Error al guardar SLA');
    }
  };

  const handleAddDia = async () => {
    if (!newFecha) return;
    try {
      await addDia.mutateAsync({ fecha: newFecha, descripcion: newDesc || undefined });
      setNewFecha('');
      setNewDesc('');
      toast.success('Día agregado');
    } catch {
      toast.error('Error al agregar día');
    }
  };

  const handleRemoveDia = async (id: number) => {
    try {
      await removeDia.mutateAsync(id);
      toast.success('Día eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const updateBloque = (dia: string, idx: number, field: 'inicio' | 'fin', value: string) => {
    setHorarioLocal(prev => {
      const copy = { ...prev };
      copy[dia] = [...(copy[dia] || [])];
      copy[dia][idx] = { ...copy[dia][idx], [field]: value };
      return copy;
    });
  };

  if (horario.isLoading || sla.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-azul-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horario Laboral */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-azul-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Horario Laboral</p>
          </div>
          <button
            onClick={handleSaveHorario}
            disabled={setHorario.isPending}
            className="cursor-pointer px-3 py-1.5 bg-azul-500 text-white rounded-lg text-xs font-semibold hover:bg-azul-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={13} /> Guardar
          </button>
        </div>
        <div className="p-5 space-y-3">
          {Object.entries(DIAS_SEMANA).map(([key, nombre]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-600">{nombre}</span>
              <div className="flex flex-wrap gap-2">
                {(horarioLocal[key] || []).map((bloque, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                    <input type="time" value={bloque.inicio} onChange={e => updateBloque(key, idx, 'inicio', e.target.value)}
                      className="text-xs border-none bg-transparent outline-none w-20" />
                    <span className="text-xs text-gray-400">—</span>
                    <input type="time" value={bloque.fin} onChange={e => updateBloque(key, idx, 'fin', e.target.value)}
                      className="text-xs border-none bg-transparent outline-none w-20" />
                  </div>
                ))}
                {(!horarioLocal[key] || horarioLocal[key].length === 0) && (
                  <span className="text-xs text-gray-400 italic">No laboral</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SLA */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Umbrales SLA</p>
          <button
            onClick={handleSaveSla}
            disabled={setSla.isPending}
            className="cursor-pointer px-3 py-1.5 bg-azul-500 text-white rounded-lg text-xs font-semibold hover:bg-azul-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={13} /> Guardar
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Primera respuesta (minutos)
            </label>
            <input type="number" min={1} max={1440} value={slaResp}
              onChange={e => setSlaResp(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-azul-400/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Resolución (horas hábiles)
            </label>
            <input type="number" min={1} max={720} value={slaResol}
              onChange={e => setSlaResol(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-azul-400/50" />
          </div>
        </div>
      </div>

      {/* Días No Laborables */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <CalendarOff size={16} className="text-naranja-500" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Días No Laborables</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Add */}
          <div className="flex gap-2">
            <input type="date" value={newFecha} onChange={e => setNewFecha(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-azul-400/50" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Descripción (opcional)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-azul-400/50" />
            <button onClick={handleAddDia} disabled={!newFecha || addDia.isPending}
              className="cursor-pointer px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-semibold hover:bg-naranja-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <Plus size={14} /> Agregar
            </button>
          </div>
          {/* List */}
          {diasData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay días no laborables registrados</p>
          ) : (
            <div className="space-y-1">
              {diasData.map(d => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-700">
                      {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {d.descripcion && <span className="text-xs text-gray-400">— {d.descripcion}</span>}
                  </div>
                  <button onClick={() => handleRemoveDia(d.id)}
                    className="cursor-pointer p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
