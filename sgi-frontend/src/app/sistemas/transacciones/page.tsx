'use client';

import { useState } from 'react';
import { ExcelUploader } from '@/components/common/ExcelUploader';
import { ContactsModal } from '@/components/common/ContactsModal';
import { AlertCircle, CheckCircle } from 'lucide-react';
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

    const handleUpload = async (file: File) => {
        setUploadStatus(null);
        try {
            const result = await uploadFile(file);
            setUploadStatus({
                type: 'success',
                message: result.message || `Se importaron ${result.records_count} registros`
            });
            setTimeout(() => setUploadStatus(null), 5000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al subir archivo';
            setUploadStatus({ type: 'error', message });
        }
    };

    const handleToggleSortRuc = () => {
        setSortByRuc(sortByRuc === 'desc' ? null : 'desc');
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header + Upload */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
                    <p className="text-gray-500">Sube el reporte de importaciones. Los datos anteriores serán reemplazados.</p>
                </div>
                <div className="w-96">
                    <ExcelUploader onUpload={handleUpload} label="Cargar Excel" />
                </div>
            </div>

            {/* Notifications */}
            {uploadStatus && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    uploadStatus.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {uploadStatus.type === 'success'
                        ? <CheckCircle className="w-5 h-5 text-green-600" />
                        : <AlertCircle className="w-5 h-5 text-red-600" />
                    }
                    <span>{uploadStatus.message}</span>
                    <button onClick={() => setUploadStatus(null)} className="ml-auto text-gray-500 hover:text-gray-700">✕</button>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
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