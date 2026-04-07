import { Search, ArrowDownWideNarrow, Loader2 } from 'lucide-react';

interface TransaccionesToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  sortByRuc: string | null;
  onToggleSortRuc: () => void;
  paisOrigen: string;
  onPaisOrigenChange: (val: string) => void;
  paisesDropdown: string[];
  cantAgentes: string;
  onCantAgentesChange: (val: string) => void;
  sinTelefono: boolean;
  onSinTelefonoChange: (val: boolean) => void;
  loading: boolean;
  total: number;
  onPageReset: () => void;
}

export default function TransaccionesToolbar({
  search,
  onSearchChange,
  sortByRuc,
  onToggleSortRuc,
  paisOrigen,
  onPaisOrigenChange,
  paisesDropdown,
  cantAgentes,
  onCantAgentesChange,
  sinTelefono,
  onSinTelefonoChange,
  loading,
  total,
  onPageReset,
}: TransaccionesToolbarProps) {
  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por RUC o Razón Social..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={onToggleSortRuc}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
            sortByRuc === 'desc'
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title="Ordenar RUC de mayor a menor"
        >
          <ArrowDownWideNarrow className="w-4 h-4" />
          RUC {sortByRuc === 'desc' ? '↓' : ''}
        </button>

        <select
          value={paisOrigen}
          onChange={(e) => { onPaisOrigenChange(e.target.value); onPageReset(); }}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-40"
        >
          <option value="">Todos los países</option>
          {paisesDropdown.map(pais => (
            <option key={pais} value={pais}>{pais}</option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          placeholder="Cant. agentes..."
          value={cantAgentes}
          onChange={(e) => { onCantAgentesChange(e.target.value); onPageReset(); }}
          className="px-3 py-2 border rounded-lg text-sm w-36 focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <label className="flex items-center gap-2 cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={sinTelefono}
            onChange={(e) => { onSinTelefonoChange(e.target.checked); onPageReset(); }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 whitespace-nowrap">Solo sin teléfono</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        <span className="text-sm text-gray-500">{total.toLocaleString()} registros</span>
      </div>
    </div>
  );
}
