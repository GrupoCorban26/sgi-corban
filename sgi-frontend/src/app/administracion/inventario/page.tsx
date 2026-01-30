'use client';

import React, { useState } from 'react';
import api from '@/lib/axios';
import { Package, Plus, Pencil, Trash2, Search, Loader2, UserPlus, UserMinus, Settings, User } from 'lucide-react';
import { toast } from 'sonner';

import { useActivos } from '@/hooks/organizacion/useActivo';
import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { Activo } from '@/types/organizacion/activo';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalActivo from './modal-activo';
import ModalAsignacion from './modal-asignacion';
import ModalDevolucion from './modal-devolucion';
import ModalGestionEstados from './modal-gestion-estados';
import ModalDetalleActivo from './modal-detalle-activo';
import ModalExportar from './modal-exportar';

export default function InventarioPage() {
    const [isDisponible, setIsDisponible] = useState<boolean | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [activoToDelete, setActivoToDelete] = useState<Activo | null>(null);

    const [isAsignarOpen, setIsAsignarOpen] = useState(false);
    const [isDevolverOpen, setIsDevolverOpen] = useState(false);
    const [isGestionEstadosOpen, setIsGestionEstadosOpen] = useState(false);
    const [isDetalleOpen, setIsDetalleOpen] = useState(false);
    const [isExportarOpen, setIsExportarOpen] = useState(false);

    const { data: empleados = [] } = useEmpleadosParaSelect();
    const { activos, totalPages, totalRegistros, isLoading, isFetching, deleteMutation } = useActivos(busqueda, null, isDisponible, empleadoId, page, 15);

    const handleOpenCreate = () => {
        setSelectedActivo(null);
        setIsModalOpen(true);
    };

    const handleRowClick = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsDetalleOpen(true);
    };

    const handleAsignar = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsAsignarOpen(true);
    };

    const handleDevolver = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsDevolverOpen(true);
    };

    const handleEdit = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsModalOpen(true);
    };

    const handleDelete = (activo: Activo) => {
        setActivoToDelete(activo);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (activoToDelete) {
            try {
                await deleteMutation.mutateAsync(activoToDelete.id);
                toast.success('Activo dado de baja correctamente');
                setIsConfirmOpen(false);
                setActivoToDelete(null);
            } catch (error) {
                toast.error('Error al dar de baja el activo');
                console.error(error);
            }
        }
    };

    const getEstadoBadge = (nombre: string, color: string) => {
        return (
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style={{
                    backgroundColor: `${color}15`, // 15% opacity
                    color: color,
                    borderColor: `${color}30` // 30% opacity
                }}
            >
                {nombre}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventario de Activos</h1>
                    <p className="text-sm text-gray-500">Gestión de equipos y recursos de la empresa</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsExportarOpen(true)}
                        className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-green-200 transition-colors"
                    >
                        <Package size={18} /> Exportar Excel
                    </button>
                    <button
                        onClick={() => setIsGestionEstadosOpen(true)}
                        className="cursor-pointer flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
                    >
                        <Settings size={18} /> Gestionar Estados
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-colors"
                    >
                        <Plus size={18} /> Nuevo Activo
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por producto, marca, modelo o código..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                    <div className="relative w-full md:w-64">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                        <select
                            value={empleadoId ?? ''}
                            onChange={(e) => { setEmpleadoId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm appearance-none bg-white relative"
                        >
                            <option value="">Todos los empleados</option>
                            {empleados.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full md:w-48">
                        <select
                            value={isDisponible === null ? '' : isDisponible.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setIsDisponible(val === '' ? null : val === 'true');
                                setPage(1);
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm appearance-none bg-white"
                        >
                            <option value="">Todos los estados</option>
                            <option value="true">Disponibles</option>
                            <option value="false">Asignados</option>
                        </select>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 whitespace-nowrap">
                        <Package size={16} />
                        <span>{totalRegistros} activos</span>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Marca</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Empleado Encargado</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
                                        <p className="text-sm text-gray-500 mt-2">Cargando activos...</p>
                                    </td>
                                </tr>
                            ) : activos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <Package size={40} className="text-gray-300 mx-auto" />
                                        <p className="text-sm text-gray-500 mt-2">No hay activos registrados</p>
                                    </td>
                                </tr>
                            ) : (
                                activos.map((activo) => (
                                    <tr
                                        key={activo.id}
                                        onClick={() => handleRowClick(activo)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-gray-800">{activo.producto}</p>
                                                {activo.modelo && <p className="text-xs text-gray-500">{activo.modelo}</p>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{activo.marca || '-'}</td>
                                        <td className="py-3 px-4">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{activo.codigo_inventario || activo.serie || '-'}</code>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {activo.empleado_asignado_nombre?.trim() ? (
                                                <div className="flex items-center gap-2">
                                                    <span>{activo.empleado_asignado_nombre}</span>
                                                    {activo.tiene_carta ? (
                                                        <span title={`Carta firmada: ${activo.fecha_carta ? new Date(activo.fecha_carta).toLocaleDateString('es-PE') : ''}`} className="text-green-600">✓</span>
                                                    ) : (
                                                        <span title="Carta pendiente" className="text-amber-500 text-xs">⚠️</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs border border-green-200">
                                                    Disponible
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getEstadoBadge(activo.estado_nombre || 'SIN ESTADO', activo.estado_color || '#6b7280')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {activo.is_disponible ? (
                                                    <button
                                                        onClick={() => handleAsignar(activo)}
                                                        className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        title="Asignar a empleado"
                                                    >
                                                        <UserPlus size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDevolver(activo)}
                                                        className="p-2 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                                        title="Registrar devolución"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleEdit(activo)}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(activo)}
                                                    disabled={!activo.is_disponible}
                                                    className={`p-2 rounded-lg transition-colors ${activo.is_disponible ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                                                    title={activo.is_disponible ? "Dar de baja" : "No se puede dar de baja (asignado)"}
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
                    <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Página {page} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isFetching}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isFetching}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            <ModalDetalleActivo
                isOpen={isDetalleOpen}
                onClose={() => setIsDetalleOpen(false)}
                activoData={selectedActivo}
            />

            <ModalActivo
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                activoData={selectedActivo}
            />

            <ModalAsignacion
                isOpen={isAsignarOpen}
                onClose={() => setIsAsignarOpen(false)}
                activoData={selectedActivo}
            />

            <ModalDevolucion
                isOpen={isDevolverOpen}
                onClose={() => setIsDevolverOpen(false)}
                activoData={selectedActivo}
            />

            <ModalGestionEstados
                isOpen={isGestionEstadosOpen}
                onClose={() => setIsGestionEstadosOpen(false)}
            />

            <ModalExportar
                isOpen={isExportarOpen}
                onClose={() => setIsExportarOpen(false)}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => { setIsConfirmOpen(false); setActivoToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="¿Dar de baja activo?"
                message={`Estás a punto de dar de baja "${activoToDelete?.producto} ${activoToDelete?.marca || ''}". Esta acción marcará el activo como no disponible.`}
                confirmText="Dar de Baja"
                isLoading={deleteMutation.isPending}
                variant="danger"
            />
        </div >
    );
}