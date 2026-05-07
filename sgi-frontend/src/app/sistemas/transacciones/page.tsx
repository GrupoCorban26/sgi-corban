'use client';

import { useState, useEffect } from 'react';
import { ExcelUploader } from '@/components/common/ExcelUploader';
import { ContactsModal } from '@/components/common/ContactsModal';
import {
  AlertCircle, CheckCircle, X, Ship, TrendingUp, Globe
} from 'lucide-react';
import { useImportaciones } from '@/hooks/comercial/useImportaciones';
import TransaccionesToolbar from './components/TransaccionesToolbar';
import ImportacionesTable from './components/ImportacionesTable';
import Pagination from '@/components/ui/Pagination';

export default function TransaccionesPage() {
  const {
    data, total, loading, error,
    page, setPage, search, setSearch,
    sinTelefono, setSinTelefono,
    sortByRuc, setSortByRuc,
    paisOrigen, setPaisOrigen,
    cantAgentes, setCantAgentes,
    paisesDropdown, pageSize,
    uploadFile, refresh
  } = useImportaciones();

  const [selectedRuc, setSelectedRuc] = useState<string | null>(null);
  const [selectedRazonSocial, setSelectedRazonSocial] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Auto-dismiss notifications
  useEffect(() => {
    if (uploadStatus?.type === 'success') {
      const timer = setTimeout(() => setUploadStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const handleUpload = async (file: File) => {
    setUploadStatus(null);
    try {
      const result = await uploadFile(file);
      setUploadStatus({
        type: 'success',
        message: result.message || `Se importaron ${result.records_count} registros exitosamente`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir archivo';
      setUploadStatus({ type: 'error', message });
    }
  };

  const handleToggleSortRuc = () => {
    setSortByRuc(sortByRuc === 'desc' ? null : 'desc');
    setPage(1);
  };

  // Quick stats
  const uniqueCountries = new Set(
    data.flatMap(item => (item.paises_principales || '').split('|').map(p => p.trim()).filter(Boolean))
  ).size;

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-azul-700 via-azul-600 to-azul-500 p-6 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-naranja-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title area */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Transacciones
              </h1>
              <p className="text-sm text-azul-200">
                Gestiona y analiza los prospectos de importaciones
              </p>
            </div>
          </div>

          {/* Quick stat pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
              <TrendingUp className="h-4 w-4 text-naranja-400" />
              <span className="text-white/70">Total prospectos:</span>
              <span className="font-semibold">{total.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span className="text-white/70">Países:</span>
              <span className="font-semibold">{uniqueCountries}</span>
            </div>

            {/* Upload toggle button */}
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="flex items-center gap-2 rounded-full bg-naranja-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-naranja-600 hover:shadow-lg active:scale-[0.97]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importar Excel
            </button>
          </div>
        </div>

        {/* Collapsible uploader */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showUploader ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl bg-white/10 p-1 backdrop-blur-sm ring-1 ring-white/20">
              <ExcelUploader onUpload={handleUpload} label="Cargar Reporte de Prospectos" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Notifications ── */}
      {uploadStatus && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-5 py-4 shadow-sm transition-all duration-300 animate-[slideDown_0.3s_ease-out] ${
            uploadStatus.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <span className="text-sm font-medium">{uploadStatus.message}</span>
          <button
            onClick={() => setUploadStatus(null)}
            className="ml-auto rounded-lg p-1 transition-colors hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── Data Card ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-black/[0.03]">
        <TransaccionesToolbar
          search={search}
          onSearchChange={setSearch}
          sortByRuc={sortByRuc}
          onToggleSortRuc={handleToggleSortRuc}
          paisOrigen={paisOrigen}
          onPaisOrigenChange={setPaisOrigen}
          paisesDropdown={paisesDropdown}
          cantAgentes={cantAgentes}
          onCantAgentesChange={setCantAgentes}
          sinTelefono={sinTelefono}
          onSinTelefonoChange={setSinTelefono}
          loading={loading}
          total={total}
          onPageReset={() => setPage(1)}
        />

        <ImportacionesTable
          data={data}
          loading={loading}
          onRowClick={(ruc, razonSocial) => {
            setSelectedRuc(ruc);
            setSelectedRazonSocial(razonSocial);
          }}
        />

        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          loading={loading}
          dataLength={data.length}
          onPageChange={setPage}
        />
      </div>

      {/* ── Contacts Modal ── */}
      {selectedRuc && (
        <ContactsModal
          ruc={selectedRuc}
          razonSocial={selectedRazonSocial}
          isOpen={true}
          onClose={() => setSelectedRuc(null)}
          onContactCreated={refresh}
        />
      )}
    </div>
  );
}