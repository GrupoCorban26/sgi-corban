'use client';

import React, { useState } from 'react';
import {
    Phone, Plus, Pencil, Trash2, Search, Loader2, Smartphone,
    History, Mail, User, Signal, Building2
} from 'lucide-react';
import { toast } from 'sonner';

import { useLineas } from '@/hooks/organizacion/useLineas';
import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { Linea } from '@/types/organizacion/linea';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalLinea from './modal-linea';
import ModalCambiarCelular from './modal-cambiar-celular';
import ModalAsignarEmpleado from './modal-asignar-empleado';
import ModalHistorial from './modal-historial';
import ModalDetalleLinea from './modal-detalle-linea';

export default function LineasPage() {
    const [busqueda, setBusqueda] = useState('');
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [page, setPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLinea, setSelectedLinea] = useState<Linea | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [lineaToDelete, setLineaToDelete] = useState<Linea | null>(null);

    const [isCambiarCelularOpen, setIsCambiarCelularOpen] = useState(false);
    const [isAsignarOpen, setIsAsignarOpen] = useState(false);
    const [isDetalleOpen, setIsDetalleOpen] = useState(false);
    const [isHistorialOpen, setIsHistorialOpen] = useState(false);

    const { data: empleados = [] } = useEmpleadosParaSelect();
    const { lineas, totalPages, totalRegistros, isLoading, isFetching, deleteMutation, desasignarMutation } = useLineas(busqueda, empleadoId, null, page, 15);

    const handleOpenCreate = () => {
        setSelectedLinea(null);
        setIsModalOpen(true);
    };

    const handleEdit = (linea: Linea) => {
        setSelectedLinea(linea);
        setIsModalOpen(true);
    };

    const handleCambiarCelular = (linea: Linea) => {
        setSelectedLinea(linea);
        setIsCambiarCelularOpen(true);
    };

    const handleAsignar = (linea: Linea) => {
        setSelectedLinea(linea);
        setIsAsignarOpen(true);
    };

    const handleDesasignar = async (linea: Linea) => {
        if (!linea.empleado_id) return;
        try {
            await desasignarMutation.mutateAsync({ id: linea.id });
            toast.success('Línea desasignada correctamente');
        } catch (error) {
            toast.error('Error al desasignar la línea');
        }
    };

    const handleHistorial = (linea: Linea) => {
        setSelectedLinea(linea);
        setIsHistorialOpen(true);
    };

    const handleDeleteClick = (linea: Linea) => {
        setLineaToDelete(linea);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!lineaToDelete) return;
        try {
            await deleteMutation.mutateAsync(lineaToDelete.id);
            toast.success('Línea dada de baja correctamente');
        } catch (error) {
            toast.error('Error al dar de baja la línea');
        } finally {
            setIsConfirmOpen(false);
            setLineaToDelete(null);
        }
    };

    const handleRowClick = (linea: Linea) => {
        setSelectedLinea(linea);
        setIsDetalleOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-200/50">
                            <Phone className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Líneas Corporativas</h1>
                            <p className="text-gray-400 text-sm">Gestión de chips, cuentas Gmail y asignación de dispositivos</p>
                        </div>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 font-medium text-sm"
                    >
                        <Plus size={18} /> Nueva Línea
                    </button>
                </div>

                {/* ── Info Banner ── */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <Signal className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                        <span className="font-semibold">Modelo Device-Centric:</span> El empleado responsable se determina por quién tiene asignado el dispositivo en Inventario.
                        <span className="text-blue-400 ml-1">Línea → Dispositivo → Empleado</span>
                    </p>
                </div>

                {/* ── Filters ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                        <div className="flex-1 relative w-full">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por número, Gmail, operador..."
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm bg-gray-50/50 hover:bg-white transition-colors"
                            />
                        </div>
                        <div className="relative w-full md:w-64">
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={empleadoId ?? ''}
                                onChange={(e) => { setEmpleadoId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm appearance-none bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                            >
                                <option value="">Todos los empleados</option>
                                {empleados.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                                ))}
                            </select>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap pl-2">
                            <Phone size={14} />
                            <span><span className="font-semibold text-gray-600">{totalRegistros}</span> líneas</span>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Celular</th>
                                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo</th>
                                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispositivo / IMEI</th>
                                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                                    <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16">
                                            <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mx-auto" />
                                            <p className="text-gray-400 mt-2.5 text-sm">Cargando líneas...</p>
                                        </td>
                                    </tr>
                                ) : lineas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16">
                                            <Phone className="h-12 w-12 text-gray-200 mx-auto" />
                                            <p className="text-gray-400 mt-2.5 font-medium">No se encontraron líneas</p>
                                            <p className="text-gray-300 text-sm mt-1">Intenta con otro filtro o crea una nueva</p>
                                        </td>
                                    </tr>
                                ) : (
                                    lineas.map((linea) => (
                                        <tr
                                            key={linea.id}
                                            onClick={() => handleRowClick(linea)}
                                            className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                                        >
                                            {/* Celular (número de línea) */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${linea.empleado_nombre ? 'bg-emerald-50' : 'bg-gray-50'
                                                        }`}>
                                                        <Phone className={`h-3.5 w-3.5 ${linea.empleado_nombre ? 'text-emerald-600' : 'text-gray-400'
                                                            }`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm tracking-wide">{linea.numero}</p>
                                                        {linea.operador && (
                                                            <p className="text-[11px] text-gray-400">{linea.operador}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Correo */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                                                    <span className="text-sm text-gray-600 truncate max-w-[200px]">{linea.gmail}</span>
                                                </div>
                                            </td>

                                            {/* Dispositivo / IMEI */}
                                            <td className="py-3.5 px-5">
                                                {linea.activo_nombre ? (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                            <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700">{linea.activo_nombre}</p>
                                                            {linea.activo_serie ? (
                                                                <p className="text-[11px] text-gray-400 font-mono">{linea.activo_serie}</p>
                                                            ) : (
                                                                <p className="text-[11px] text-gray-300 italic">Sin IMEI</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-300 italic">Sin dispositivo</span>
                                                )}
                                            </td>

                                            {/* Empleado */}
                                            <td className="py-3.5 px-5">
                                                {linea.empleado_nombre ? (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-3.5 w-3.5 text-violet-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800">{linea.empleado_nombre}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">
                                                        Disponible
                                                    </span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleHistorial(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver historial"
                                                    >
                                                        <History size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCambiarCelular(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Cambiar dispositivo"
                                                    >
                                                        <Smartphone size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Dar de baja"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-sm text-gray-500">
                                Página <span className="font-semibold text-gray-700">{page}</span> de <span className="font-semibold text-gray-700">{totalPages}</span>
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isFetching}
                                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-gray-600"
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || isFetching}
                                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-gray-600"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modales */}
            <ModalLinea
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                linea={selectedLinea}
            />

            <ModalCambiarCelular
                isOpen={isCambiarCelularOpen}
                onClose={() => setIsCambiarCelularOpen(false)}
                linea={selectedLinea}
            />

            <ModalAsignarEmpleado
                isOpen={isAsignarOpen}
                onClose={() => setIsAsignarOpen(false)}
                linea={selectedLinea}
            />

            <ModalHistorial
                isOpen={isHistorialOpen}
                onClose={() => setIsHistorialOpen(false)}
                linea={selectedLinea}
            />

            <ModalDetalleLinea
                isOpen={isDetalleOpen}
                onClose={() => setIsDetalleOpen(false)}
                linea={selectedLinea}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Dar de baja línea"
                message={`¿Estás seguro de dar de baja la línea ${lineaToDelete?.numero}?`}
                confirmText="Dar de baja"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
