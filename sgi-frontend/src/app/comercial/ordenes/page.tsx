'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Building2, Loader2, CheckCircle2, AlertCircle, ChevronDown, Filter } from 'lucide-react';
import { useOrdenes, useResumenOrdenes, useImportarSispac, useImportarSintad, ImportResult } from '@/hooks/comercial/useOrdenes';
import { toast } from 'sonner';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getPeriodoActual() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodo(p: string) {
    const [year, month] = p.split('-');
    return `${MESES[parseInt(month) - 1]} ${year}`;
}

const TIPO_COLORS: Record<string, string> = {
    CARGA: 'bg-blue-100 text-blue-700',
    LOGISTICO: 'bg-purple-100 text-purple-700',
    ADUANAS: 'bg-amber-100 text-amber-700',
    INTEGRAL: 'bg-emerald-100 text-emerald-700',
};

export default function OrdenesPage() {
    const [periodo, setPeriodo] = useState(getPeriodoActual());
    const [empresa, setEmpresa] = useState<string>('');
    const [page, setPage] = useState(1);

    // Queries
    const { data: ordenes, isLoading } = useOrdenes(periodo, empresa || undefined, undefined, page);
    const { data: resumen } = useResumenOrdenes(periodo);

    // Mutations
    const importSispac = useImportarSispac();
    const importSintad = useImportarSintad();

    // Refs for file inputs
    const sispacCorbanRef = useRef<HTMLInputElement>(null);
    const sispacEblRef = useRef<HTMLInputElement>(null);
    const sintadRef = useRef<HTMLInputElement>(null);

    // Import result modal
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const handleSispacUpload = async (file: File, emp: string) => {
        try {
            const result = await importSispac.mutateAsync({ file, empresa: emp });
            setImportResult(result);
            toast.success(`${emp}: ${result.nuevas} nuevas, ${result.actualizadas} actualizadas`);
        } catch {
            toast.error('Error al importar SISPAC');
        }
    };

    const handleSintadUpload = async (file: File) => {
        try {
            const result = await importSintad.mutateAsync(file);
            setImportResult(result);
            toast.success(`SINTAD: ${result.nuevas} nuevas, ${result.actualizadas} actualizadas`);
        } catch {
            toast.error('Error al importar SINTAD');
        }
    };

    const isImporting = importSispac.isPending || importSintad.isPending;

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-gray-800 uppercase">Centro de Órdenes</h1>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={periodo}
                        onChange={e => { setPeriodo(e.target.value); setPage(1); }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={empresa}
                        onChange={e => { setEmpresa(e.target.value); setPage(1); }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Todas las empresas</option>
                        <option value="CORBAN">Corban Trans Logistic</option>
                        <option value="EBL">EBL Grupo Logístico</option>
                    </select>
                </div>
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-3 gap-4">
                {/* SISPAC Corban */}
                <div
                    onClick={() => !isImporting && sispacCorbanRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/50 ${isImporting ? 'opacity-50 cursor-not-allowed' : 'border-gray-300'}`}
                >
                    <input ref={sispacCorbanRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => e.target.files?.[0] && handleSispacUpload(e.target.files[0], 'CORBAN')} />
                    <div className="flex flex-col items-center gap-2">
                        {importSispac.isPending ? <Loader2 className="animate-spin text-blue-500" size={28} /> : <Upload className="text-blue-500" size={28} />}
                        <span className="text-sm font-semibold text-gray-700">SISPAC — Corban</span>
                        <span className="text-xs text-gray-400">Reporte de Carga/Logístico</span>
                    </div>
                </div>

                {/* SISPAC EBL */}
                <div
                    onClick={() => !isImporting && sispacEblRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/50 ${isImporting ? 'opacity-50 cursor-not-allowed' : 'border-gray-300'}`}
                >
                    <input ref={sispacEblRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => e.target.files?.[0] && handleSispacUpload(e.target.files[0], 'EBL')} />
                    <div className="flex flex-col items-center gap-2">
                        {importSispac.isPending ? <Loader2 className="animate-spin text-purple-500" size={28} /> : <Upload className="text-purple-500" size={28} />}
                        <span className="text-sm font-semibold text-gray-700">SISPAC — EBL</span>
                        <span className="text-xs text-gray-400">Reporte de Carga/Logístico</span>
                    </div>
                </div>

                {/* SINTAD */}
                <div
                    onClick={() => !isImporting && sintadRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50 ${isImporting ? 'opacity-50 cursor-not-allowed' : 'border-gray-300'}`}
                >
                    <input ref={sintadRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => e.target.files?.[0] && handleSintadUpload(e.target.files[0])} />
                    <div className="flex flex-col items-center gap-2">
                        {importSintad.isPending ? <Loader2 className="animate-spin text-amber-500" size={28} /> : <FileSpreadsheet className="text-amber-500" size={28} />}
                        <span className="text-sm font-semibold text-gray-700">SINTAD — Aduanas</span>
                        <span className="text-xs text-gray-400">Corban Aduanas (COR + EBL)</span>
                    </div>
                </div>
            </div>

            {/* Import Result */}
            {importResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                    <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">Resultado de la última importación</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>Filas procesadas: <strong className="text-gray-700">{importResult.total_filas}</strong></span>
                            <span>Nuevas: <strong className="text-green-600">{importResult.nuevas}</strong></span>
                            <span>Actualizadas: <strong className="text-blue-600">{importResult.actualizadas}</strong></span>
                            {importResult.errores > 0 && (
                                <span>Errores: <strong className="text-red-600">{importResult.errores}</strong></span>
                            )}
                        </div>
                        {importResult.detalle_errores.length > 0 && (
                            <div className="mt-2 text-xs text-red-500 space-y-0.5">
                                {importResult.detalle_errores.slice(0, 5).map((e, i) => (
                                    <p key={i}><AlertCircle size={12} className="inline mr-1" />{e}</p>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer">✕</button>
                </div>
            )}

            {/* Resumen Cards */}
            {resumen && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Órdenes</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{resumen.total_ordenes}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatPeriodo(resumen.periodo)}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase font-medium">Sin "Casa"</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{resumen.total_sin_casa}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Órdenes comerciales reales</p>
                    </div>
                    {Object.entries(resumen.por_tipo_servicio).map(([tipo, count]) => (
                        <div key={tipo} className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-gray-500 uppercase font-medium">{tipo}</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{count}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Progreso por Comercial */}
            {resumen && resumen.comerciales.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Progreso de Meta por Comercial (20 órdenes/mes)</h2>
                    <div className="space-y-3">
                        {resumen.comerciales.map((c, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700 w-40 truncate">{c.comercial_nombre}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${c.porcentaje_meta >= 100 ? 'bg-green-500' : c.porcentaje_meta >= 50 ? 'bg-blue-500' : 'bg-red-400'}`}
                                        style={{ width: `${Math.min(c.porcentaje_meta, 100)}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                                        {c.total_ordenes} / {c.meta}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold w-16 text-right">{c.porcentaje_meta}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-3">N° Base</th>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Consignatario</th>
                                <th className="px-4 py-3">Comercial</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Casa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" size={16} />Cargando...</td></tr>
                            ) : ordenes?.data.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No hay órdenes importadas para este periodo</td></tr>
                            ) : ordenes?.data.map(orden => (
                                <tr key={orden.id} className={`hover:bg-gray-50 ${orden.es_casa ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-2.5 font-mono font-bold text-gray-800">{orden.numero_base}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500">{orden.codigo_sispac || orden.codigo_sintad}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-xs px-2 py-0.5 rounded-lg ${orden.empresa_origen === 'EBL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {orden.empresa_origen}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-xs px-2 py-0.5 rounded-lg ${TIPO_COLORS[orden.tipo_servicio] || 'bg-gray-100 text-gray-700'}`}>
                                            {orden.tipo_servicio}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{orden.consignatario}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{orden.comercial_nombre || orden.comercial_iniciales || '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-500 text-xs">{orden.fecha_ingreso || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs">{orden.estado_sispac || orden.estado_sintad || '—'}</td>
                                    <td className="px-4 py-2.5">{orden.es_casa && <span title="Cliente de casa"><Building2 size={14} className="text-orange-400" /></span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {ordenes && ordenes.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            Mostrando {((ordenes.page - 1) * ordenes.page_size) + 1}–{Math.min(ordenes.page * ordenes.page_size, ordenes.total)} de {ordenes.total}
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >Anterior</button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= ordenes.pages}
                                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}