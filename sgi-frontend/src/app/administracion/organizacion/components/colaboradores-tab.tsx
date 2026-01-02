import { Search } from 'lucide-react';
import { ActionIcons } from './action-icons';

interface ColaboradoresTabProps {
  onOpenHistory: (entity: any) => void;
}

export function ColaboradoresTab({ onOpenHistory }: ColaboradoresTabProps) {
  return (
    <div className="p-6">
      {/* BARRA DE BÚSQUEDA */}
      <div className="flex justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-80 transition-all"
            placeholder="Buscar por nombre, cargo o DNI..."
          />
        </div>
      </div>
      
      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3 font-bold">Colaborador</th>
              <th className="px-4 py-3 font-bold">Área</th>
              <th className="px-4 py-3 font-bold">Cargo</th>
              <th className="px-4 py-3 font-bold">Estado</th>
              <th className="px-4 py-3 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-blue-50/40 transition-colors group">
              <td className="px-4 py-4 font-semibold text-gray-800">Maricielo Silva</td>
              <td className="px-4 py-4 text-gray-600">Sistemas</td>
              <td className="px-4 py-4 text-gray-500 text-xs">Analista QA</td>
              <td className="px-4 py-4">
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold border border-green-200">
                  ACTIVO
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <ActionIcons onHistory={() => onOpenHistory({ name: 'Maricielo Silva' })} />
              </td>
            </tr>
            {/* Se pueden mapear más filas aquí */}
          </tbody>
        </table>
      </div>
    </div>
  );
}