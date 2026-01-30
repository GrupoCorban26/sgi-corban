/**
 * Contacts Modal - Shows contacts for a specific RUC
 * Allows: View, Add, Delete contacts
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Phone, Mail, Briefcase } from 'lucide-react';
import { useContactos } from '@/hooks/comercial/useContactos';
import { Contacto } from '@/types/contactos';

interface ContactsModalProps {
    ruc: string;
    razonSocial: string;
    isOpen: boolean;
    onClose: () => void;
    onContactCreated?: () => void; // Callback para refrescar lista cuando se agrega contacto
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
        // También notificar al padre por si el delete afecta la vista filtrada
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
            // Notificar al padre para que refresque la lista filtrada
            onContactCreated?.();
        } catch (e) {
            alert('Error al agregar contacto');
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-blue-600 to-blue-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Contactos</h2>
                        <p className="text-blue-100 text-sm">{razonSocial} ({ruc})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 overflow-y-auto">
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
                                    className="border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Teléfono *"
                                    value={newContact.telefono}
                                    onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
                                />
                                <input
                                    className="border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                />
                                <input
                                    className="border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Cargo"
                                    value={newContact.cargo}
                                    onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                                />
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-sm">
                                    <Save className="w-4 h-4" /> Guardar
                                </button>
                                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Contacts List */}
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Cargando contactos...</div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                            <Phone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No hay contactos registrados</p>
                            <p className="text-sm">Agrega el primer contacto usando el botón de arriba.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contacts.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-shadow">
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
            </div>
        </div>
    );
};
