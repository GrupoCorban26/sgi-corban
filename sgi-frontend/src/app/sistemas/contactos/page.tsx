/**
 * Contactos Page (Sistemas)
 * - Estadísticas de disponibles
 * - Gestión de lotes (LotesSection)
 * - CRUD de Casos de Llamada
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { contactosService } from '@/services/comercial/contactos';
import { casosLlamadaService } from '@/services/comercial/casos-llamada';
import { ContactoStats } from '@/types/contactos';
import { CasoLlamada } from '@/types/casos-llamada';
import {
    Users, Phone, Clock, Plus, Pencil, Trash2, X,
    BookUser, Loader2, UserCheck, Settings2, Download
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import LotesSection from './components/LotesSection';

export default function ContactosPage() {
    const [stats, setStats] = useState<ContactoStats | null>(null);
    const [loading, setLoading] = useState(false);

    // Estado casos llamada
    const [casos, setCasos] = useState<CasoLlamada[]>([]);
    const [showCasosModal, setShowCasosModal] = useState(false);
    const [editingCaso, setEditingCaso] = useState<CasoLlamada | null>(null);
    const [casoForm, setCasoForm] = useState({ nombre: '', contestado: false, gestionable: false });

    // Estado eliminación
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Cargar estadísticas
    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await contactosService.getStats();
            setStats({
                total_registros: data.total ?? 0,
                disponibles: data.disponibles ?? 0,
                asignados: data.asignados ?? 0,
                en_gestion: data.en_gestion ?? 0,
                total_filtrado: data.total ?? 0,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
            setStats({ total_registros: 0, disponibles: 0, asignados: 0, en_gestion: 0, total_filtrado: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar casos de llamada
    const loadCasos = async () => {
        try {
            const data = await casosLlamadaService.getAll();
            setCasos(data);
        } catch (error) {
            console.error('Error loading casos:', error);
        }
    };

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadCasos();
    }, []);

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['ruc', 'telefono', 'correo', 'razon_social', 'sector', 'paises_principales', 'nombre'],
            ['20100000001', '987654321', 'ejemplo@correo.com', 'Empresa Ejemplo S.A.C.', 'Comercio', 'China|USA', 'Juan Perez'],
        ]);
        ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
        XLSX.writeFile(wb, 'plantilla_contactos.xlsx');
    };

    // CRUD Casos
    const handleSaveCaso = async () => {
        try {
            if (editingCaso) {
                await casosLlamadaService.update(editingCaso.id, casoForm);
                toast.success('Caso de llamada actualizado correctamente');
            } else {
                await casosLlamadaService.create(casoForm);
                toast.success('Caso de llamada creado correctamente');
            }
            loadCasos();
            setShowCasosModal(false);
            setCasoForm({ nombre: '', contestado: false, gestionable: false });
            setEditingCaso(null);
        } catch (error) {
            console.error('Error saving caso:', error);
            toast.error('Error al guardar caso de llamada');
        }
    };

    const handleDeleteCaso = (id: number) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await casosLlamadaService.delete(confirmDelete.id);
            toast.success('Caso de llamada eliminado correctamente');
            loadCasos();
            setConfirmDelete({ isOpen: false, id: null });
        } catch (error: unknown) {
            const axiosErr = error as { response?: { data?: { detail?: string } } };
            const msg = axiosErr.response?.data?.detail || 'Error al eliminar';
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditCaso = (caso: CasoLlamada) => {
        setEditingCaso(caso);
        setCasoForm({ nombre: caso.nombre, contestado: caso.contestado, gestionable: caso.gestionable || false });
        setShowCasosModal(true);
    };

    return (
        <div className="space-y-5">
            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-azul-700 via-azul-600 to-azul-500 p-6 shadow-lg">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-naranja-500/10 blur-3xl" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                            <BookUser className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Contactos</h1>
                            <p className="text-sm text-azul-200">Sube contactos y gestiona los casos de llamada</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/20 transition-all duration-200 hover:bg-white/20 active:scale-[0.97]"
                        >
                            <Download className="h-4 w-4" />
                            Descargar Plantilla
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-azul-100/50 blur-xl transition-all group-hover:bg-azul-100" />
                        <div className="relative">
                            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-azul-100">
                                <Users className="h-4.5 w-4.5 text-azul-600" />
                            </div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total_registros.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-emerald-100/50 blur-xl transition-all group-hover:bg-emerald-100" />
                        <div className="relative">
                            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                                <Phone className="h-4.5 w-4.5 text-emerald-600" />
                            </div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Disponibles</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.disponibles.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-amber-100/50 blur-xl transition-all group-hover:bg-amber-100" />
                        <div className="relative">
                            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                                <Clock className="h-4.5 w-4.5 text-amber-600" />
                            </div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Asignados</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.asignados.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-violet-100/50 blur-xl transition-all group-hover:bg-violet-100" />
                        <div className="relative">
                            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                                <UserCheck className="h-4.5 w-4.5 text-violet-600" />
                            </div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">En Gestión</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.en_gestion.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Gestión de Lotes ── */}
            <LotesSection onLoteChange={loadStats} />

            {/* ── Casos de Llamada ── */}
            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-black/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                            <Settings2 className="h-4 w-4 text-violet-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">Casos de Llamada</h2>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{casos.length}</span>
                    </div>
                    <button
                        onClick={() => { setEditingCaso(null); setCasoForm({ nombre: '', contestado: false, gestionable: false }); setShowCasosModal(true); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-azul-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul-600 active:scale-[0.97]"
                    >
                        <Plus className="h-3.5 w-3.5" /> Nuevo
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 p-5">
                    {casos.map(caso => (
                        <div key={caso.id} className={`group rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm ${caso.contestado ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className="flex items-start justify-between">
                                <span className={`text-sm font-semibold ${caso.contestado ? 'text-emerald-800' : 'text-gray-700'}`}>
                                    {caso.nombre}
                                </span>
                                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button onClick={() => openEditCaso(caso)} className="rounded-md p-1.5 transition-colors hover:bg-white">
                                        <Pencil className="h-3 w-3 text-gray-400" />
                                    </button>
                                    <button onClick={() => handleDeleteCaso(caso.id)} className="rounded-md p-1.5 transition-colors hover:bg-red-50">
                                        <Trash2 className="h-3 w-3 text-red-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${caso.contestado ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'}`}>
                                    {caso.contestado ? '✓ Contestado' : 'No contestado'}
                                </span>
                                {caso.gestionable && (
                                    <span className="inline-flex items-center rounded-md bg-azul-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-azul-700 ring-1 ring-inset ring-azul-200">
                                        Gestionable
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Casos */}
            {
                showCasosModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-[slideDown_0.25s_ease-out]">
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">{editingCaso ? 'Editar Caso' : 'Nuevo Caso'}</h3>
                                <button onClick={() => setShowCasosModal(false)} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                                    <X className="h-5 w-5 text-gray-400" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
                                    <input
                                        type="text"
                                        value={casoForm.nombre}
                                        onChange={(e) => setCasoForm(f => ({ ...f, nombre: e.target.value }))}
                                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-azul-400 focus:outline-none focus:ring-2 focus:ring-azul-500/20"
                                        placeholder="Ej: Contestó - Interesado"
                                    />
                                </div>
                                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        id="contestado"
                                        checked={casoForm.contestado}
                                        onChange={(e) => setCasoForm(f => ({ ...f, contestado: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-azul-600 focus:ring-azul-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">¿Contestó la llamada?</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        id="gestionable"
                                        checked={casoForm.gestionable}
                                        onChange={(e) => setCasoForm(f => ({ ...f, gestionable: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-azul-600 focus:ring-azul-500"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">¿Es gestionable?</span>
                                        <p className="text-xs text-gray-400">Permite continuar el flujo de gestión</p>
                                    </div>
                                </label>
                            </div>
                            <div className="mt-6 flex justify-end gap-2.5">
                                <button
                                    onClick={() => setShowCasosModal(false)}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveCaso}
                                    disabled={!casoForm.nombre.trim()}
                                    className="rounded-lg bg-azul-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-azul-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Modal Confirmación Eliminación */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={confirmDeleteAction}
                title="Eliminar Caso"
                message="¿Estás seguro de que deseas eliminar este caso de llamada? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isLoading={isDeleting}
            />
        </div>
    );
}