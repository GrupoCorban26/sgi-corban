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

  return (
    <div className="p-4 border-t border-gray-200 flex justify-between items-center">
      <button
        disabled={page === 1 || loading}
        onClick={() => onPageChange(page - 1)}
        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Página</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={page}
          onChange={(e) => {
            const newPage = parseInt(e.target.value) || 1;
            onPageChange(Math.max(1, Math.min(newPage, totalPages)));
          }}
          className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <span>de {totalPages}</span>
      </div>
      <button
        disabled={dataLength < pageSize || loading}
        onClick={() => onPageChange(page + 1)}
        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
