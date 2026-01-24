'use client';

import React, { useState } from 'react';
import { ModalBase, ModalHeader, useModalContext } from '@/components/ui/modal';
import { Settings, Plus, Pencil, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { useEstadosActivo, EstadoActivo, EstadoActivoCreate, EstadoActivoUpdate } from '@/hooks/organizacion/useEstadoActivo';
import { toast } from 'sonner';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function ModalGestionEstadosContent() {
    const [busqueda, setBusqueda] = useState('');
    const [page, setPage] = useState(1);
    const { listData, pagination, isLoading, isFetching, createMutation, updateMutation, deleteMutation } = useEstadosActivo(busqueda, page, 5);

    const [editingState, setEditingState] = useState<EstadoActivo | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');

    const handleEdit = (estado: EstadoActivo) => {
        setEditingState(estado);
        setNombre(estado.nombre);
        setDescripcion(estado.descripcion || '');
        setIsAdding(false);
    };

    const handleAdd = () => {
        setEditingState(null);
        setNombre('');
        setDescripcion('');
        setIsAdding(true);
    };

    const handleCancelForm = () => {
        setEditingState(null);
        setIsAdding(false);
        setNombre('');
        setDescripcion('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        try {
            if (editingState) {
                const updateData: EstadoActivoUpdate = {
                    nombre,
                    descripcion: descripcion || undefined
                };
                await updateMutation.mutateAsync({ id: editingState.id, data: updateData });
                toast.success('Estado actualizado');
            } else {
                const createData: EstadoActivoCreate = {
                    nombre,
                    descripcion: descripcion || undefined
                };
                await createMutation.mutateAsync(createData);
                toast.success('Estado creado');
            }
            handleCancelForm();
        } catch (error: unknown) {
            toast.error('Error al guardar el estado');
        }
    };

    const handleDelete = async (estado: EstadoActivo) => {
        if (!confirm(`¿Estás seguro de eliminar el estado "${estado.nombre}"?`)) return;

        try {
            await deleteMutation.mutateAsync(estado.id);
            toast.success('Estado eliminado');
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al eliminar');
        }
    };

    const isFormVisible = isAdding || editingState;
    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <ModalHeader icon={<Settings size={20} className="text-gray-600" />} title="Gestionar Estados de Activo" />

            <div className="p-6 space-y-6">

                {/* Formulario Inline */}
                {isFormVisible && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            {editingState ? 'Editar Estado' : 'Nuevo Estado'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Nombre (ej. BUENO)"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        placeholder="Descripción (opcional)"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCancelForm}
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Lista y Acciones */}
                <div className="space-y-4">
                    {!isFormVisible && (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Lista de estados registrados</p>
                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                            >
                                <Plus size={14} /> Nuevo Estado
                            </button>
                        </div>
                    )}

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={3} className="py-8 text-center text-xs text-gray-500">Cargando...</td></tr>
                                ) : listData.length === 0 ? (
                                    <tr><td colSpan={3} className="py-8 text-center text-xs text-gray-500">No hay estados registrados</td></tr>
                                ) : (
                                    listData.map((estado) => (
                                        <tr key={estado.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-3 text-sm text-gray-800 font-medium">{estado.nombre}</td>
                                            <td className="py-2 px-3 text-xs text-gray-500">{estado.descripcion || '-'}</td>
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(estado)}
                                                        className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                                        disabled={!!isFormVisible}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(estado)}
                                                        className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                        disabled={!!isFormVisible}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Simple */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span className="text-xs py-1 text-gray-500">{page} / {pagination.totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="px-2 py-1 text-xs border rounded-md disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function ModalGestionEstados({ isOpen, onClose }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
            <ModalGestionEstadosContent />
        </ModalBase>
    );
}
