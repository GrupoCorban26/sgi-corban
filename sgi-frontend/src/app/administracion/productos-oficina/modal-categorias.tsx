'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { ModalBase, ModalHeader } from '@/components/ui/modal';
import { CategoriaProductoOficina, CategoriaCreate, CategoriaUpdate } from '@/types/organizacion/producto-oficina';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    categorias: CategoriaProductoOficina[];
    onCreate: (datos: CategoriaCreate) => void;
    onUpdate: (id: number, datos: CategoriaUpdate) => void;
    onDelete: (id: number) => void;
    isLoading: boolean;
}

export default function ModalCategorias({ isOpen, onClose, categorias, onCreate, onUpdate, onDelete, isLoading }: Props) {
    const [modo, setModo] = useState<'lista' | 'crear' | 'editar'>('lista');
    const [editId, setEditId] = useState<number | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const resetForm = () => {
        setModo('lista');
        setEditId(null);
        setNombre('');
        setDescripcion('');
    };

    const handleEdit = (cat: CategoriaProductoOficina) => {
        setModo('editar');
        setEditId(cat.id);
        setNombre(cat.nombre);
        setDescripcion(cat.descripcion || '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modo === 'crear') {
            onCreate({ nombre, descripcion: descripcion || undefined });
        } else if (modo === 'editar' && editId) {
            onUpdate(editId, { nombre, descripcion: descripcion || undefined });
        }
        resetForm();
    };

    const handleDelete = (id: number) => {
        if (confirmDelete === id) {
            onDelete(id);
            setConfirmDelete(null);
        } else {
            setConfirmDelete(id);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                icon={<Tag size={20} className="text-indigo-600" />}
                title="Gestionar Categorías"
            />

            <div className="p-5 overflow-y-auto flex-1 max-h-[60vh]">
                {/* Formulario crear/editar */}
                {(modo === 'crear' || modo === 'editar') && (
                    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-blue-50 rounded-xl space-y-3">
                        <p className="text-sm font-semibold text-blue-800">
                            {modo === 'crear' ? 'Nueva categoría' : 'Editar categoría'}
                        </p>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                            maxLength={100}
                            placeholder="Nombre de la categoría"
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        />
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            maxLength={300}
                            placeholder="Descripción (opcional)"
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!nombre.trim() || isLoading}
                                className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {modo === 'crear' ? 'Crear' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Botón agregar */}
                {modo === 'lista' && (
                    <button
                        onClick={() => setModo('crear')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 rounded-xl transition-colors text-sm"
                    >
                        <Plus size={16} /> Agregar categoría
                    </button>
                )}

                {/* Lista de categorías */}
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : categorias.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No hay categorías registradas</p>
                ) : (
                    <div className="space-y-2">
                        {categorias.map((cat) => (
                            <div
                                key={cat.id}
                                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 text-sm">{cat.nombre}</p>
                                    {cat.descripcion && (
                                        <p className="text-xs text-gray-500 truncate">{cat.descripcion}</p>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {cat.cantidad_productos} producto(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(cat)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${confirmDelete === cat.id
                                                ? 'text-white bg-red-500 hover:bg-red-600'
                                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                        title={confirmDelete === cat.id ? 'Confirmar eliminación' : 'Eliminar'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ModalBase>
    );
}
