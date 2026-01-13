'use client';

import { useState } from 'react';
import { ExcelUploader } from '@/components/common/ExcelUploader';
import { ContactsModal } from '@/components/importaciones/ContactsModal';
import { Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useImportaciones } from '@/hooks/useImportaciones';

export default function TransaccionesPage() {
    const {
        data,
        total,
        loading,
        error,
        page,
        setPage,
        search,
        setSearch,
        pageSize,
        uploadFile
    } = useImportaciones();

    const [selectedRuc, setSelectedRuc] = useState<string | null>(null);
    const [selectedRazonSocial, setSelectedRazonSocial] = useState<string>('');
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleUpload = async (file: File) => {
        setUploadStatus(null);
        try {
            const result = await uploadFile(file);
            setUploadStatus({
                type: 'success',
                message: result.message || `Se importaron ${result.records_count} registros`
            });
            // Auto-hide after 5 seconds
            setTimeout(() => setUploadStatus(null), 5000);
        } catch (err: any) {
            setUploadStatus({ type: 'error', message: err.message });
        }
    };

    const handleRowClick = (ruc: string, razonSocial: string) => {
        setSelectedRuc(ruc);
        setSelectedRazonSocial(razonSocial);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
                    <p className="text-gray-500">Sube el reporte de importaciones. Los datos anteriores serán reemplazados.</p>
                </div>
                <div className="w-96">
                    <ExcelUploader onUpload={handleUpload} label="Cargar Excel" />
                </div>
            </div>

            {/* Toast Notifications */}
            {uploadStatus && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${uploadStatus.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {uploadStatus.type === 'success'
                        ? <CheckCircle className="w-5 h-5 text-green-600" />
                        : <AlertCircle className="w-5 h-5 text-red-600" />
                    }
                    <span>{uploadStatus.message}</span>
                    <button
                        onClick={() => setUploadStatus(null)}
                        className="ml-auto text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* API Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por RUC o Razón Social..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        <span className="text-sm text-gray-500">{total.toLocaleString()} registros</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">RUC</th>
                                <th className="px-4 py-3">Razón Social</th>
                                <th className="px-4 py-3">Año</th>
                                <th className="px-4 py-3">Aduanas</th>
                                <th className="px-4 py-3">Países Origen</th>
                                <th className="px-4 py-3 text-right">FOB Anual</th>
                                <th className="px-4 py-3 text-right">Operaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && data.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Cargando datos...
                                </td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No hay registros. Sube un Excel para comenzar.</td></tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => handleRowClick(String(item.ruc) || '', item.razon_social || '')}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.ruc}</td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={item.razon_social}>{item.razon_social}</td>
                                        <td className="px-4 py-3">{item.anio || item.año}</td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={item.aduanas}>{item.aduanas}</td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={item.paises_origen}>{item.paises_origen}</td>
                                        <td className="px-4 py-3 text-right font-medium">{item.fob_anual?.toLocaleString('es-PE', { style: 'currency', currency: 'USD' })}</td>
                                        <td className="px-4 py-3 text-right">{item.total_operaciones?.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                    <button
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-gray-600">Página {page} de {Math.ceil(total / pageSize) || 1}</span>
                    <button
                        disabled={data.length < pageSize || loading}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {selectedRuc && (
                <ContactsModal
                    ruc={selectedRuc}
                    razonSocial={selectedRazonSocial}
                    isOpen={true}
                    onClose={() => setSelectedRuc(null)}
                />
            )}
        </div>
    );
}