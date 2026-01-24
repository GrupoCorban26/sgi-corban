'use client';

import React, { useState } from 'react';
import { Package, Plus, Pencil, Trash2, Search, Loader2, UserPlus, UserMinus, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { useActivos } from '@/hooks/organizacion/useActivo';
import { Activo } from '@/types/organizacion/activo';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalActivo from './modal-activo';
import ModalAsignacion from './modal-asignacion';
import ModalDevolucion from './modal-devolucion';
import ModalGestionEstados from './modal-gestion-estados';

export default function InventarioPage() {
    const [busqueda, setBusqueda] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [activoToDelete, setActivoToDelete] = useState<Activo | null>(null);

    const [isAsignarOpen, setIsAsignarOpen] = useState(false);
    const [isDevolverOpen, setIsDevolverOpen] = useState(false);
    const [isGestionEstadosOpen, setIsGestionEstadosOpen] = useState(false);

    const { activos, totalPages, totalRegistros, isLoading, isFetching, deleteMutation } = useActivos(busqueda, null, null, page, 15);

    const handleOpenCreate = () => {
        setSelectedActivo(null);
        setIsModalOpen(true);
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
        if (!activoToDelete) return;
        try {
            await deleteMutation.mutateAsync(activoToDelete.id);
            toast.success('Activo dado de baja correctamente');
            setIsConfirmOpen(false);
            setActivoToDelete(null);
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al dar de baja');
        }
    };

    const handleAsignar = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsAsignarOpen(true);
    };

    const handleDevolver = (activo: Activo) => {
        setSelectedActivo(activo);
        setIsDevolverOpen(true);
    };

    const getEstadoBadge = (estado: string, disponible: boolean) => {
        const estilos: Record<string, string> = {
            'BUENO': 'bg-green-100 text-green-700',
            'REGULAR': 'bg-yellow-100 text-yellow-700',
            'DAÑADO': 'bg-red-100 text-red-700',
            'EN_REPARACION': 'bg-blue-100 text-blue-700',
            'BAJA': 'bg-gray-100 text-gray-700',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${estilos[estado] || 'bg-gray-100 text-gray-700'}`}>{estado.replace('_', ' ')}</span>;
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
                        onClick={() => setIsGestionEstadosOpen(true)}
                        className="cursor-pointer flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm"
                    >
                        <Settings size={18} /> Gestionar Estados
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200"
                    >
                        <Plus size={18} /> Nuevo Activo
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por producto, marca, modelo o código..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Package size={16} />
                        <span>{totalRegistros} activos registrados</span>
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
                                    <tr key={activo.id} className="hover:bg-gray-50 transition-colors">
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
                                            {activo.empleado_asignado_nombre?.trim() || <span className="text-gray-400 italic">Sin asignar</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getEstadoBadge(activo.estado_nombre || 'SIN ESTADO', activo.is_disponible)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center gap-2">
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
        </div>
    );
}