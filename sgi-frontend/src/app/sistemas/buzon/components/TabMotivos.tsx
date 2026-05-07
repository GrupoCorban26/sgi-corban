'use client';

import { useState } from 'react';
import { Plus, Edit2, Power, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBuzonConfig } from '@/hooks/useBuzonConfig';

interface Motivo {
  id: number;
  nombre: string;
  is_active: boolean;
}

export default function TabMotivos() {
  const { motivos, createMotivo, updateMotivo, toggleMotivo } = useBuzonConfig();
  const data: Motivo[] = motivos.data || [];
  const loading = motivos.isLoading;

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createMotivo.mutateAsync(newName.trim());
      setNewName('');
      toast.success('Motivo creado');
    } catch {
      toast.error('Error al crear motivo');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateMotivo.mutateAsync({ id, nombre: editName.trim() });
      setEditingId(null);
      toast.success('Motivo actualizado');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleMotivo.mutateAsync(id);
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-azul-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nuevo motivo de descarte..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-azul-400/50 focus:border-azul-400 outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || createMotivo.isPending}
          className="cursor-pointer px-4 py-2.5 bg-azul-500 text-white rounded-xl text-sm font-semibold hover:bg-azul-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Motivos registrados ({data.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No hay motivos registrados
            </div>
          ) : (
            data.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                {editingId === m.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(m.id)}
                      className="flex-1 px-3 py-1.5 border border-azul-300 rounded-lg text-sm focus:ring-2 focus:ring-azul-400/50 outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(m.id)} className="cursor-pointer p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="cursor-pointer p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${m.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {m.nombre}
                    </span>
                  </div>
                )}
                {editingId !== m.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(m.id); setEditName(m.nombre); }}
                      className="cursor-pointer p-1.5 text-azul-500 hover:bg-azul-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(m.id)}
                      className={`cursor-pointer p-1.5 rounded-lg transition-colors ${m.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      title={m.is_active ? 'Desactivar' : 'Activar'}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
