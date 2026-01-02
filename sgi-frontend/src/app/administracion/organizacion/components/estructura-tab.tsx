import { GitGraph, ChevronDown, ChevronRight } from 'lucide-react';
import { ActionIcons } from './action-icons';

interface EstructuraTabProps {
  onOpenHistory: (entity: any) => void;
}

export function EstructuraTab({ onOpenHistory }: EstructuraTabProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-4">
        <GitGraph size={16} />
        Áreas y Departamentos
      </div>
      
      <div className="space-y-2">
        {/* NIVEL 1: GERENCIA */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:border-blue-200 transition-all">
          <div className="flex items-center gap-3">
            <ChevronDown size={18} className="text-gray-400" />
            <span className="font-bold text-gray-700">Gerencia General</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionIcons onHistory={() => onOpenHistory({ name: 'Gerencia General' })} />
          </div>
        </div>
        
        {/* NIVEL 2: DEPARTAMENTOS (Indentado) */}
        <div className="ml-8 space-y-2 border-l-2 border-gray-100 pl-4">
          <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg group hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight size={18} className="text-gray-300" />
              <span className="text-gray-600 font-medium">Administración y Finanzas</span>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionIcons onHistory={() => onOpenHistory({ name: 'Adm. y Finanzas' })} />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg group hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight size={18} className="text-gray-300" />
              <span className="text-gray-600 font-medium">Sistemas</span>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionIcons onHistory={() => onOpenHistory({ name: 'Sistemas' })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}