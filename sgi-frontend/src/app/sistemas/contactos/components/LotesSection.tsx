'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { contactosService } from '@/services/comercial/contactos';
import { Lote } from '@/types/contactos';
import {
    Layers, Plus, Upload, Loader2, X,
    ToggleLeft, ToggleRight, Package
} from 'lucide-react';
import { toast } from 'sonner';

interface LotesSectionProps {
    onLoteChange?: () => void;
}

export default function LotesSection({ onLoteChange }: LotesSectionProps) {
    const [lotes, setLotes] = useState<Lote[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newLoteName, setNewLoteName] = useState('');
    const [creating, setCreating] = useState(false);
    const [uploadingLoteId, setUploadingLoteId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);

    const loadLotes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await contactosService.getLotes();
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

    const handleCreate = async () => {
        if (!newLoteName.trim()) return;
        setCreating(true);
        try {
            await contactosService.createLote(newLoteName.trim());
            toast.success(`Lote "${newLoteName.trim()}" creado exitosamente`);
            setNewLoteName('');
            setShowCreateModal(false);
            loadLotes();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Error al crear lote');
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (loteId: number) => {
        setTogglingId(loteId);
        try {
            const res = await contactosService.toggleLote(loteId);
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

    const handleUploadClick = (loteId: number) => {
        setSelectedLoteId(loteId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedLoteId) return;
        setUploadingLoteId(selectedLoteId);
        try {
            const res = await contactosService.uploadToLote(selectedLoteId, file);
            toast.success(res.message);
            loadLotes();
            onLoteChange?.();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Error al subir archivo');
        } finally {
            setUploadingLoteId(null);
            setSelectedLoteId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getProgressPercent = (lote: Lote) => {
        if (lote.total_contactos === 0) return 0;
        return Math.round((lote.disponibles / lote.total_contactos) * 100);
    };

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
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-azul-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul-600 active:scale-[0.97]"
                    >
                        <Plus className="h-3.5 w-3.5" /> Nuevo Lote
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
                        <p className="text-xs text-gray-500">Crea un lote para empezar a subir contactos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/80">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
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
                                    return (
                                        <tr key={lote.id} className="transition-colors duration-150 hover:bg-gray-50/60">
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm font-semibold text-gray-800">{lote.nombre}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-500">
                                                {new Date(lote.created_at).toLocaleDateString('es-PE', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric'
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
                                                    lote.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-gray-100 text-gray-500 ring-gray-200'
                                                }`}>
                                                    {lote.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleUploadClick(lote.id)}
                                                        disabled={uploadingLoteId === lote.id}
                                                        title="Subir Excel al lote"
                                                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-azul-50 hover:text-azul-600 disabled:opacity-50"
                                                    >
                                                        {uploadingLoteId === lote.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Upload className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggle(lote.id)}
                                                        disabled={togglingId === lote.id}
                                                        title={lote.is_active ? 'Desactivar lote' : 'Activar lote'}
                                                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                                                    >
                                                        {togglingId === lote.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : lote.is_active ? (
                                                            <ToggleRight className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <ToggleLeft className="h-4 w-4" />
                                                        )}
                                                    </button>
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

            {/* Modal Crear Lote */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-[slideDown_0.25s_ease-out]">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Nuevo Lote</h3>
                            <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre del Lote</label>
                            <input
                                type="text"
                                value={newLoteName}
                                onChange={(e) => setNewLoteName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20"
                                placeholder="Ej: Campaña Mayo 2026"
                                autoFocus
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-2.5">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newLoteName.trim() || creating}
                                className="inline-flex items-center gap-2 rounded-lg bg-azul-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-azul-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Crear Lote
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
