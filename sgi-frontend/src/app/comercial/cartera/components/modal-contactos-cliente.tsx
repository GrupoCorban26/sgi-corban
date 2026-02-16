'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Save, Loader2, Phone, Mail, User, Briefcase, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';

import api from '@/lib/axios';

// ============================================
// TIPOS
// ============================================
interface Contacto {
    id: number;
    ruc: string;
    nombre: string | null;
    cargo: string | null;
    telefono: string;
    correo: string | null;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    ruc: string;
    razonSocial: string;
}

interface ModalContentProps {
    ruc: string;
    razonSocial: string;
    isOpen: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';



// ============================================
// COMPONENTE INTERNO
// ============================================
function ModalContent({ ruc, razonSocial, isOpen }: ModalContentProps) {
    const { handleClose } = useModalContext();

    const [contactos, setContactos] = useState<Contacto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [editedRows, setEditedRows] = useState<{ [key: number]: Partial<Contacto> }>({});
    const [showNewRow, setShowNewRow] = useState(false);
    const [newContacto, setNewContacto] = useState({ nombre: '', cargo: '', telefono: '', correo: '' });
    const [isCreating, setIsCreating] = useState(false);

    // Cargar contactos
    const loadContactos = useCallback(async () => {
        if (!ruc) return;
        setIsLoading(true);
        try {
            const response = await api.get(`/contactos/ruc/${ruc}`);
            setContactos(response.data || []);
        } catch (error) {
            console.error('Error loading contacts:', error);
            setContactos([]);
        } finally {
            setIsLoading(false);
        }
    }, [ruc]);

    useEffect(() => {
        if (isOpen && ruc) {
            loadContactos();
            setEditedRows({});
            setShowNewRow(false);
            setNewContacto({ nombre: '', cargo: '', telefono: '', correo: '' });
        }
    }, [isOpen, ruc, loadContactos]);

    // Manejar cambios en campos editados
    const handleFieldChange = (id: number, field: string, value: string) => {
        setEditedRows(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    // Obtener valor del campo (editado o original)
    const getFieldValue = (contacto: Contacto, field: keyof Contacto): string => {
        if (editedRows[contacto.id]?.[field] !== undefined) {
            return editedRows[contacto.id][field] as string || '';
        }
        return (contacto[field] as string) || '';
    };

    // Verificar si hay cambios en una fila
    const hasChanges = (id: number): boolean => {
        return !!editedRows[id] && Object.keys(editedRows[id]).length > 0;
    };

    // Guardar cambios de un contacto
    const handleSaveRow = async (contacto: Contacto) => {
        if (!hasChanges(contacto.id)) return;

        setSavingId(contacto.id);
        try {
            const updateData = {
                nombre: getFieldValue(contacto, 'nombre') || null,
                cargo: getFieldValue(contacto, 'cargo') || null,
                telefono: getFieldValue(contacto, 'telefono'),
                correo: getFieldValue(contacto, 'correo') || null
            };

            await api.put(`/contactos/${contacto.id}`, updateData);

            toast.success('Contacto actualizado');
            setEditedRows(prev => {
                const newRows = { ...prev };
                delete newRows[contacto.id];
                return newRows;
            });
            loadContactos();
        } catch (error) {
            console.error('Error updating contact:', error);
            toast.error('Error al actualizar contacto');
        } finally {
            setSavingId(null);
        }
    };

    // Crear nuevo contacto
    const handleCreateContacto = async () => {
        if (!newContacto.telefono.trim()) {
            toast.error('El teléfono es requerido');
            return;
        }

        setIsCreating(true);
        try {
            await api.post(`/contactos/`, {
                ruc,
                nombre: newContacto.nombre || null,
                cargo: newContacto.cargo || null,
                telefono: newContacto.telefono,
                correo: newContacto.correo || null
            });

            toast.success('Contacto agregado');
            setShowNewRow(false);
            setNewContacto({ nombre: '', cargo: '', telefono: '', correo: '' });
            loadContactos();
        } catch (error) {
            console.error('Error creating contact:', error);
            toast.error('Error al crear contacto');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <ModalHeader
                icon={<Users size={20} className="text-indigo-600" />}
                title={`Contactos de ${razonSocial}`}
            />

            <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm text-blue-700">
                        Completa los datos de los contactos de este cliente. Puedes editar los campos directamente y guardar cada fila.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <>
                        {/* Tabla de contactos */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr className="text-gray-600 text-xs uppercase">
                                        <th className="px-3 py-2 text-left font-semibold">
                                            <div className="flex items-center gap-1">
                                                <Phone size={12} /> Teléfono
                                            </div>
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold">
                                            <div className="flex items-center gap-1">
                                                <User size={12} /> Nombre
                                            </div>
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold">
                                            <div className="flex items-center gap-1">
                                                <Briefcase size={12} /> Cargo
                                            </div>
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold">
                                            <div className="flex items-center gap-1">
                                                <Mail size={12} /> Correo
                                            </div>
                                        </th>
                                        <th className="px-3 py-2 text-center font-semibold w-24">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {contactos.length === 0 && !showNewRow ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                                                No hay contactos registrados
                                            </td>
                                        </tr>
                                    ) : (
                                        contactos.map((contacto) => (
                                            <tr key={contacto.id} className={hasChanges(contacto.id) ? 'bg-yellow-50' : ''}>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="text"
                                                        value={getFieldValue(contacto, 'telefono')}
                                                        onChange={(e) => handleFieldChange(contacto.id, 'telefono', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                        placeholder="Teléfono"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="text"
                                                        value={getFieldValue(contacto, 'nombre')}
                                                        onChange={(e) => handleFieldChange(contacto.id, 'nombre', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                        placeholder="Nombre del contacto"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="text"
                                                        value={getFieldValue(contacto, 'cargo')}
                                                        onChange={(e) => handleFieldChange(contacto.id, 'cargo', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                        placeholder="Cargo"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="email"
                                                        value={getFieldValue(contacto, 'correo')}
                                                        onChange={(e) => handleFieldChange(contacto.id, 'correo', e.target.value)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                        placeholder="correo@empresa.com"
                                                    />
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    {hasChanges(contacto.id) ? (
                                                        <button
                                                            onClick={() => handleSaveRow(contacto)}
                                                            disabled={savingId === contacto.id}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                                        >
                                                            {savingId === contacto.id ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <Save size={12} />
                                                            )}
                                                            Guardar
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Sin cambios</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    {/* Nueva fila para agregar */}
                                    {showNewRow && (
                                        <tr className="bg-green-50">
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={newContacto.telefono}
                                                    onChange={(e) => setNewContacto(prev => ({ ...prev, telefono: e.target.value }))}
                                                    className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-white"
                                                    placeholder="Teléfono *"
                                                    autoFocus
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={newContacto.nombre}
                                                    onChange={(e) => setNewContacto(prev => ({ ...prev, nombre: e.target.value }))}
                                                    className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-white"
                                                    placeholder="Nombre"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={newContacto.cargo}
                                                    onChange={(e) => setNewContacto(prev => ({ ...prev, cargo: e.target.value }))}
                                                    className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-white"
                                                    placeholder="Cargo"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="email"
                                                    value={newContacto.correo}
                                                    onChange={(e) => setNewContacto(prev => ({ ...prev, correo: e.target.value }))}
                                                    className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-white"
                                                    placeholder="Correo"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button
                                                        onClick={handleCreateContacto}
                                                        disabled={isCreating}
                                                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                                        title="Guardar"
                                                    >
                                                        {isCreating ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Save size={14} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowNewRow(false)}
                                                        className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                                                        title="Cancelar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Botón agregar */}
                        {!showNewRow && (
                            <button
                                onClick={() => setShowNewRow(true)}
                                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
                            >
                                <Plus size={18} />
                                Agregar Nuevo Contacto
                            </button>
                        )}
                    </>
                )}
            </div>

            <ModalFooter>
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                    Listo
                </button>
            </ModalFooter>
        </>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ModalContactosCliente({ isOpen, onClose, ruc, razonSocial }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
            <ModalContent ruc={ruc} razonSocial={razonSocial} isOpen={isOpen} />
        </ModalBase>
    );
}
