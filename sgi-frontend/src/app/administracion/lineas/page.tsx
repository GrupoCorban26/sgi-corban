'use client';

import React, { useState } from 'react';
import { Phone, Plus, Pencil, Trash2, Search, Loader2, Smartphone, UserPlus, UserMinus, History } from 'lucide-react';
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Phone className="text-indigo-600" /> Líneas Corporativas
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Gestión de chips y cuentas Gmail corporativas</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} /> Nueva Línea
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por número, gmail u operador..."
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                        <div className="relative w-64">
                            <select
                                value={empleadoId ?? ''}
                                onChange={(e) => { setEmpleadoId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm appearance-none bg-white"
                            >
                                <option value="">Todos los empleados</option>
                                {empleados.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Phone size={16} />
                            <span>{totalRegistros} líneas registradas</span>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Número</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Gmail</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Operador</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Proveedor</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Celular</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Empleado Asignado</th>
                                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                                            <p className="text-gray-500 mt-2">Cargando líneas...</p>
                                        </td>
                                    </tr>
                                ) : lineas.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <Phone className="h-12 w-12 text-gray-300 mx-auto" />
                                            <p className="text-gray-500 mt-2">No se encontraron líneas</p>
                                        </td>
                                    </tr>
                                ) : (
                                    lineas.map((linea) => (
                                        <tr
                                            key={linea.id}
                                            onClick={() => handleRowClick(linea)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-gray-900">{linea.numero}</span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{linea.gmail}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{linea.operador || '-'}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{linea.proveedor || '-'}</td>
                                            <td className="py-3 px-4">
                                                {linea.activo_nombre ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                                        <Smartphone size={12} /> {linea.activo_nombre}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">Sin celular</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {linea.empleado_nombre ? (
                                                    <span className="text-sm text-gray-900">{linea.empleado_nombre}</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs">
                                                        Disponible
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleHistorial(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver historial"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCambiarCelular(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Cambiar dispositivo"
                                                    >
                                                        <Smartphone size={16} />
                                                    </button>
                                                    {/* Botones de asignacion manual removidos por refactor Device-Centric */}
                                                    <button
                                                        onClick={() => handleEdit(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(linea)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Dar de baja"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="text-sm text-gray-600">
                                Página {page} de {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isFetching}
                                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || isFetching}
                                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente
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
