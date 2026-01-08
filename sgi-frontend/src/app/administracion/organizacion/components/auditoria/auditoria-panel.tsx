import { History } from 'lucide-react';
import { TimelineItem } from './timeline-item';

export function AuditoriaPanel({ onClose, entity }: any) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center gap-2 text-orange-600 font-bold">
            <History size={20} />
            <span>Historial de Auditoría</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="space-y-6">
          <p className="text-sm font-semibold text-gray-700">Registro: <span className="text-blue-600">{entity?.name}</span></p>
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:bg-gray-100">
            <TimelineItem date="02 Ene 2026" user="Maricielo" action="Update" details="Cambio de nombre" />
            <TimelineItem date="15 Dic 2025" user="Sistema" action="Created" details="Carga inicial" />
          </div>
        </div>
      </div>
    </div>
  );
}