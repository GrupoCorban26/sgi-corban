/**
 * Base Page (Sistemas)
 * Merge entre Transacciones (importaciones) y Contactos
 * Merge entre Transacciones (importaciones) y Contactos
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { baseService } from '@/services/comercial/base';
import { contactosService } from '@/services/comercial/contactos';
import { BaseContacto, BaseStats } from '@/types/base';
import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { toast } from 'sonner';
import {
    Search, Users, Phone, Building2, TrendingUp,
    ChevronLeft, ChevronRight, Loader2, ArrowDownWideNarrow, ArrowUpDown, UserPlus, X
} from 'lucide-react';

export default function BasePage() {
    const [data, setData] = useState<BaseContacto[]>([]);
    const [stats, setStats] = useState<BaseStats | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [sortByRucDesc, setSortByRucDesc] = useState(false);

    // Estado para la modal de derivación de lead
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRucToAssign, setSelectedRucToAssign] = useState<string | null>(null);
    const [selectedComercial, setSelectedComercial] = useState<number | ''>('');
    const [isAssigning, setIsAssigning] = useState(false);

    const { data: comerciales = [] } = useEmpleadosParaSelect();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await baseService.getBase(page, pageSize, search || undefined);
            setData(response.data || []);
            setTotal(response.total || 0);
            if (response.stats) {
                setStats(response.stats);
            }
        } catch (error) {
            console.error('Error loading base:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    const handleOpenAssignModal = (ruc: string) => {
        setSelectedRucToAssign(ruc);
        setSelectedComercial('');
        setIsAssignModalOpen(true);
    };

    const handleAssignLead = async () => {
        if (!selectedRucToAssign || selectedComercial === '') return;

        setIsAssigning(true);
        try {
            const resp = await contactosService.assignManual(selectedRucToAssign, Number(selectedComercial));
            if (resp.success) {
                toast.success(resp.message);
                setIsAssignModalOpen(false);
                loadData(); // recargar la tabla para mostrar el nuevo estado
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Error al derivar lead');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Base Comercial</h1>
                <p className="text-gray-500">
                    Merge entre Transacciones y Contactos
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Total de Contactos</span>
                        </div>
                        <span className="text-2xl font-bold">{(stats.total_contactos ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Empresas {`> 1 o 0`} agentes</span>
                        </div>
                        <span className="text-2xl font-bold">{(stats.empresas_multi_0_agentes ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Contactos Disponibles</span>
                        </div>
                        <span className="text-2xl font-bold">{(stats.contactos_disponibles ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Empresas Diferentes</span>
                        </div>
                        <span className="text-2xl font-bold">{(stats.empresas_diferentes ?? 0).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por RUC o Razón Social..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        <span className="text-sm text-gray-500">{total.toLocaleString()} contactos</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">RUC</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Razón Social</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Teléfono</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Correo</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">FOB Total</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Transacciones</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">China</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        No hay registros que coincidan con los criterios.
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{item.ruc}</td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={item.razon_social}>
                                            {item.razon_social}
                                        </td>
                                        <td className="px-4 py-3">{item.telefono}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{item.correo || '-'}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {item.fob_total_real?.toLocaleString('es-PE', { style: 'currency', currency: 'USD' }) || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">{item.transacciones_datasur?.toLocaleString() || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.importa_de_china === 'SÍ' || item.importa_de_china === 'SI' ? (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">SÍ</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">NO</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block
                                                ${item.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-700' : ''}
                                                ${item.estado === 'ASIGNADO' ? 'bg-amber-100 text-amber-700' : ''}
                                                ${item.estado === 'EN_GESTION' ? 'bg-purple-100 text-purple-700' : ''}
                                            `}>
                                                {item.estado}
                                            </span>
                                            {item.estado === 'DISPONIBLE' && (
                                                <button
                                                    onClick={() => handleOpenAssignModal(item.ruc)}
                                                    className="ml-2 text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded-full transition-colors"
                                                    title="Derivar a Comercial"
                                                >
                                                    <UserPlus size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DERIVAR LEAD */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Derivar Lead Manulamente</h2>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                                disabled={isAssigning}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-500">
                                Vas a asignar el RUC <span className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">{selectedRucToAssign}</span> a un comercial específico.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Seleccionar Comercial
                                </label>
                                <select
                                    value={selectedComercial}
                                    onChange={(e) => setSelectedComercial(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    disabled={isAssigning}
                                >
                                    <option value="">-- Seleccione un asesor --</option>
                                    {comerciales.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombres} {c.apellidos}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                disabled={isAssigning}
                                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAssignLead}
                                disabled={selectedComercial === '' || isAssigning}
                                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Asignar Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}