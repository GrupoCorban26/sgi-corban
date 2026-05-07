import { Loader2, Package, ArrowUpRight } from 'lucide-react';
import { Importacion } from '@/types/importaciones';

interface ImportacionesTableProps {
  data: Importacion[];
  loading: boolean;
  onRowClick: (ruc: string, razonSocial: string) => void;
}

function ScoreBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) return <span className="text-gray-300">—</span>;

  let styles = 'bg-gray-100 text-gray-600 ring-gray-200';

  if (score >= 70) {
    styles = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  } else if (score >= 45) {
    styles = 'bg-amber-50 text-amber-700 ring-amber-200';
  } else {
    styles = 'bg-gray-100 text-gray-600 ring-gray-200';
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset ${styles}`}
    >
      {score}
    </span>
  );
}

function CurrencyCell({ value }: { value: number | undefined }) {
  if (value === undefined || value === null) return <span className="text-gray-300">—</span>;

  return (
    <span className="font-medium tabular-nums text-gray-800">
      {value.toLocaleString('es-PE', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })}
    </span>
  );
}

function RecencyBadge({ dias }: { dias: number | undefined }) {
  if (dias === undefined || dias === null) return <span className="text-gray-300">—</span>;

  let styles = 'bg-gray-100 text-gray-600 ring-gray-200';
  let label = `${dias}d`;

  if (dias <= 7) {
    styles = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  } else if (dias <= 30) {
    styles = 'bg-blue-50 text-blue-700 ring-blue-200';
  } else if (dias <= 90) {
    styles = 'bg-amber-50 text-amber-700 ring-amber-200';
  } else {
    styles = 'bg-red-50 text-red-600 ring-red-200';
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

export default function ImportacionesTable({ data, loading, onRowClick }: ImportacionesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              RUC
            </th>
            <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Razón Social
            </th>
            <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Sector
            </th>
            <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Score
            </th>
            <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              FOB Prom.
            </th>
            <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Embarques
            </th>
            <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Agentes
            </th>
            <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Vía
            </th>
            <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Países
            </th>
            <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Recency
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading && data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-azul-400" />
                  <span className="text-sm font-medium text-gray-500">
                    Cargando prospectos...
                  </span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    <Package className="h-7 w-7 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Sin registros
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Sube un archivo Excel de prospectos para comenzar a ver datos.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick(String(item.ruc) || '', item.razon_social || '')}
                className="group cursor-pointer transition-colors duration-150 hover:bg-azul-50/40"
              >
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span className="font-mono text-xs font-semibold text-azul-700">
                    {item.ruc}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-5 py-3.5" title={item.razon_social}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {item.razon_social}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-5 py-3.5 text-xs text-gray-500" title={item.sector}>
                  {item.sector || '—'}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <ScoreBadge score={item.score} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  <CurrencyCell value={item.fob_promedio} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-xs text-gray-700">
                  {item.total_embarques?.toLocaleString() ?? '—'}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-xs text-gray-700">
                  {item.agentes_distintos ?? 0}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs text-gray-500">
                  {item.via_predominante || '—'}
                </td>
                <td className="max-w-[140px] truncate px-5 py-3.5 text-xs text-gray-500" title={item.paises_principales}>
                  {item.paises_principales || '—'}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-center">
                  <RecencyBadge dias={item.dias_desde_ultima} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
