import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  dataLength: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, total, pageSize, loading, dataLength, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-5 py-3.5">
      {/* Record range info */}
      <span className="text-xs text-gray-500">
        {total > 0 ? (
          <>
            Mostrando <span className="font-semibold text-gray-700">{startRecord}</span>
            {' - '}
            <span className="font-semibold text-gray-700">{endRecord}</span>
            {' de '}
            <span className="font-semibold text-gray-700">{total.toLocaleString()}</span>
          </>
        ) : (
          'Sin registros'
        )}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              const newPage = parseInt(e.target.value) || 1;
              onPageChange(Math.max(1, Math.min(newPage, totalPages)));
            }}
            className="h-8 w-12 rounded-lg border border-gray-200 bg-white text-center text-xs font-semibold text-gray-700 shadow-sm transition-all duration-200 focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20"
          />
          <span className="text-gray-400">/</span>
          <span className="font-semibold text-gray-600">{totalPages}</span>
        </div>

        <button
          disabled={dataLength < pageSize || loading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
