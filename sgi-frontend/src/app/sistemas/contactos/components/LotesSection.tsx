'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { lotesService } from '@/services/comercial/lotes';
import { Lote } from '@/types/contactos';
import {
    Layers, Upload, Loader2, Package, X, Download
} from 'lucide-react';
import { toast } from 'sonner';

interface LotesSectionProps {
    onLoteChange?: () => void;
}

export default function LotesSection({ onLoteChange }: LotesSectionProps) {
    const [lotes, setLotes] = useState<Lote[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingLoteId, setUploadingLoteId] = useState<boolean>(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [downloadingIds, setDownloadingIds] = useState<Record<number, boolean>>({});

    // Estados para el Modal de Creación
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loteEmpresa, setLoteEmpresa] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadLotes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await lotesService.getLotes();
            setLotes(data);
        } catch (error) {
            console.error('Error loading lotes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLotes();
    }, [loadLotes]);

    const handleToggle = async (loteId: number) => {
        setTogglingId(loteId);
        try {
            const res = await lotesService.toggleLote(loteId);
            toast.success(res.message);
            loadLotes();
            onLoteChange?.();
        } catch (error) {
            toast.error('Error al cambiar estado del lote');
            console.error(error);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDownload = async (lote: Lote) => {
        setDownloadingIds(prev => ({ ...prev, [lote.id]: true }));
        try {
            const blob = await lotesService.downloadLote(lote.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const cleanName = lote.nombre_archivo.replace(/\s+/g, '_');
            a.download = cleanName.endsWith('.xlsx') ? cleanName : `${cleanName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success('Reporte cruzado descargado correctamente');
        } catch (error) {
            console.error('Error al descargar lote:', error);
            toast.error('Error al descargar el reporte del lote');
        } finally {
            setDownloadingIds(prev => ({ ...prev, [lote.id]: false }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Por favor, selecciona un archivo Excel primero.');
            return;
        }
        setUploadingLoteId(true);
        try {
            const res = await lotesService.uploadLote(selectedFile, loteEmpresa || undefined);
            toast.success(res.message || 'Lote creado con éxito');
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setLoteEmpresa('');
            loadLotes();
            onLoteChange?.();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Error al subir archivo');
        } finally {
            setUploadingLoteId(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getProgressPercent = (lote: Lote) => {
        if (lote.total_contactos === 0) return 0;
        return Math.round((lote.disponibles / lote.total_contactos) * 100);
    };

    const isActivo = (lote: Lote) => lote.estado === 'DISPONIBLE';

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-black/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                            <Layers className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">Gestión de Lotes</h2>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                            {lotes.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-azul-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul-600 active:scale-[0.97]"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Subir Excel / Nuevo Lote
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-azul-400" />
                    </div>
                ) : lotes.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                            <Package className="h-7 w-7 text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Sin lotes</p>
                        <p className="text-xs text-gray-500">Crea un lote para comenzar a gestionar contactos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/80">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">ID</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Archivo</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Empresa Destinada</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Fecha Carga</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Disponibles</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Estado</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {lotes.map(lote => {
                                    const progress = getProgressPercent(lote);
                                    const activo = isActivo(lote);
                                    return (
                                        <tr key={lote.id} className="transition-colors duration-150 hover:bg-gray-50/60">
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-gray-400">
                                                #{lote.id}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm font-semibold text-gray-800">{lote.nombre_archivo}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                                    lote.empresa === 'CORBAN'
                                                        ? 'bg-blue-50 text-blue-700 ring-blue-200'
                                                        : lote.empresa === 'EBL'
                                                        ? 'bg-purple-50 text-purple-700 ring-purple-200'
                                                        : 'bg-gray-50 text-gray-500 ring-gray-200'
                                                }`}>
                                                    {lote.empresa || 'General (Todas)'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-500">
                                                {new Date(lote.created_at).toLocaleDateString('es-PE', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-sm font-medium text-gray-700">
                                                {lote.total_contactos.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <div className="w-20 overflow-hidden rounded-full bg-gray-100 h-1.5">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                progress > 50 ? 'bg-emerald-500' : progress > 20 ? 'bg-amber-500' : 'bg-red-400'
                                                            }`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="tabular-nums text-sm font-semibold text-gray-800">
                                                        {lote.disponibles.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                                    activo
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-gray-100 text-gray-500 ring-gray-200'
                                                }`}>
                                                    {activo ? 'Disponible' : 'Finalizado'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    {/* Botón de descarga cruzada */}
                                                    <button
                                                        onClick={() => handleDownload(lote)}
                                                        disabled={downloadingIds[lote.id]}
                                                        title="Descargar reporte cruzado de llamadas del lote"
                                                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-azul-600 disabled:opacity-40"
                                                    >
                                                        {downloadingIds[lote.id] ? (
                                                            <Loader2 className="h-4.5 w-4.5 animate-spin text-azul-500" />
                                                        ) : (
                                                            <Download className="h-4.5 w-4.5" />
                                                        )}
                                                    </button>

                                                    {/* Toggle Switch */}
                                                    {togglingId === lote.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-azul-500" />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleToggle(lote.id)}
                                                            disabled={togglingId === lote.id}
                                                            title={activo ? 'Desactivar lote' : 'Activar lote'}
                                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-azul-500/20 focus:ring-offset-2 disabled:opacity-50 ${
                                                                activo ? 'bg-emerald-500' : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                    activo ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Creación / Subida */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-[slideDown_0.25s_ease-out]">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Lote</h3>
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setLoteEmpresa('');
                                }}
                                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Selector de Archivo Excel */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Archivo Excel</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 transition-all hover:bg-gray-50 hover:border-azul-400"
                                >
                                    <Upload className="mb-2 h-8 w-8 text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-600">Haga clic para seleccionar archivo Excel</span>
                                    <span className="mt-1 text-[10px] text-gray-400 font-medium">Formatos admitidos: .xlsx, .xls</span>
                                </div>
                            </div>

                            {/* Nombre del Archivo Autocompletado */}
                            {selectedFile && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre del Archivo Seleccionado</label>
                                    <input
                                        type="text"
                                        value={selectedFile.name}
                                        readOnly
                                        disabled
                                        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500 focus:outline-none cursor-not-allowed font-medium"
                                    />
                                </div>
                            )}

                            {/* Empresa Destinada */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Empresa Destinada</label>
                                <select
                                    value={loteEmpresa}
                                    onChange={(e) => setLoteEmpresa(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20 font-medium"
                                >
                                    <option value="">General (Todas las empresas)</option>
                                    <option value="CORBAN">Corban (Agencia de Aduanas / Trans Logistic)</option>
                                    <option value="EBL">EBL</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2.5">
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setLoteEmpresa('');
                                }}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploadingLoteId}
                                className="flex items-center gap-1.5 rounded-lg bg-azul-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-azul-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {uploadingLoteId ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Subiendo...
                                    </>
                                ) : (
                                    'Crear Lote'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
