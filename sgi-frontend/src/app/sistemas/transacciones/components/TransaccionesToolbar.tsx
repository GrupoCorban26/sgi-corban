import {
  Search, ArrowDownWideNarrow, Loader2, Filter,
  ChevronDown, PhoneOff
} from 'lucide-react';

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
  const hasActiveFilters = sortByRuc || paisOrigen || cantAgentes || sinTelefono;

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
      {/* Top row: Search + Stats */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por RUC o Razón Social..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20"
          />
        </div>

        {/* Stats badge */}
        <div className="flex items-center gap-3">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-azul-500" />
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-azul-500/10 px-3.5 py-1.5 text-xs font-semibold text-azul-700">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-azul-500" />
            {total.toLocaleString()} registros
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 rounded-full bg-naranja-100 px-3 py-1.5 text-xs font-semibold text-naranja-700">
              <Filter className="h-3 w-3" />
              Filtros activos
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {/* Sort by RUC */}
        <button
          onClick={onToggleSortRuc}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
            sortByRuc === 'desc'
              ? 'border-azul-300 bg-azul-50 text-azul-700 shadow-sm ring-1 ring-azul-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
          title="Ordenar RUC de mayor a menor"
        >
          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          RUC {sortByRuc === 'desc' ? '↓' : ''}
        </button>

        {/* Country filter */}
        <div className="relative">
          <select
            value={paisOrigen}
            onChange={(e) => { onPaisOrigenChange(e.target.value); onPageReset(); }}
            className={`appearance-none rounded-lg border py-2 pl-3 pr-8 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-azul-500/20 ${
              paisOrigen
                ? 'border-azul-300 bg-azul-50 text-azul-700 shadow-sm ring-1 ring-azul-200'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <option value="">🌍 Todos los países</option>
            {paisesDropdown.map(pais => (
              <option key={pais} value={pais}>{pais}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Agents filter */}
        <div className="relative">
          <input
            type="number"
            min={0}
            placeholder="Cant. agentes"
            value={cantAgentes}
            onChange={(e) => { onCantAgentesChange(e.target.value); onPageReset(); }}
            className={`w-32 rounded-lg border py-2 pl-3 pr-3 text-xs font-medium transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20 ${
              cantAgentes
                ? 'border-azul-300 bg-azul-50 text-azul-700 shadow-sm ring-1 ring-azul-200'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          />
        </div>

        {/* Sin teléfono toggle */}
        <button
          onClick={() => { onSinTelefonoChange(!sinTelefono); onPageReset(); }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
            sinTelefono
              ? 'border-naranja-300 bg-naranja-50 text-naranja-700 shadow-sm ring-1 ring-naranja-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <PhoneOff className="h-3.5 w-3.5" />
          Sin teléfono
        </button>
      </div>
    </div>
  );
}
