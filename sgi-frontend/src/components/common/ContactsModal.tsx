/**
 * Contacts Modal - Shows contacts for a specific RUC
 * Allows: View, Add, Delete contacts
 */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Phone, Mail, Briefcase, Users } from 'lucide-react';
import { ModalBase, ModalHeader } from '@/components/ui/modal';
import { useContactos } from '@/hooks/comercial/useContactos';
import { Contacto } from '@/types/contactos';

interface ContactsModalProps {
    ruc: string;
    razonSocial: string;
    isOpen: boolean;
    onClose: () => void;
    onContactCreated?: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ ruc, razonSocial, isOpen, onClose, onContactCreated }) => {
    const { contacts, loading, fetchByRuc, create, remove } = useContactos();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({ telefono: '', email: '', cargo: '' });

    useEffect(() => {
        if (isOpen && ruc) {
            fetchByRuc(ruc);
        }
    }, [isOpen, ruc, fetchByRuc]);

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Seguro de eliminar este contacto?')) return;
        await remove(id);
        fetchByRuc(ruc);
        onContactCreated?.();
    };

    const handleAdd = async () => {
        if (!newContact.telefono.trim()) {
            alert('El teléfono es obligatorio');
            return;
        }
        try {
            await create({
                ruc,
                telefono: newContact.telefono,
                email: newContact.email || undefined,
                cargo: newContact.cargo || undefined,
                is_client: false,
                origen: 'MANUAL'
            });
            setNewContact({ telefono: '', email: '', cargo: '' });
            setShowAddForm(false);
            fetchByRuc(ruc);
            onContactCreated?.();
        } catch (e) {
            alert('Error al agregar contacto');
            console.error(e);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <ModalHeader
                icon={<Users size={20} className="text-blue-600" />}
                title="Contactos"
            />

            {/* Subtitle */}
            <div className="px-5 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-700">{razonSocial} ({ruc})</p>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
                {/* Add Button */}
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="mb-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Agregar Contacto
                    </button>
                )}

                {/* Add Form */}
                {showAddForm && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-medium text-green-800 mb-3">Nuevo Contacto</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <input
                                className="border p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                placeholder="Teléfono *"
                                value={newContact.telefono}
                                onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
                            />
                            <input
                                className="border p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                placeholder="Email"
                                value={newContact.email}
                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                            />
                            <input
                                className="border p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                placeholder="Cargo"
                                value={newContact.cargo}
                                onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                            />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm">
                                <Save className="w-4 h-4" /> Guardar
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Contacts List */}
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Cargando contactos...</div>
                ) : contacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                        <Phone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No hay contactos registrados</p>
                        <p className="text-sm">Agrega el primer contacto usando el botón de arriba.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contacts.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Phone className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{c.telefono}</p>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                                            {c.cargo && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.cargo}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(c.id!)}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Eliminar contacto"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ModalBase>
    );
};
