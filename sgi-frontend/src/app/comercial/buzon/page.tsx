'use client';

import React, { useState, useEffect } from 'react';
import { useInbox } from '@/hooks/comercial/useInbox';
import { InboxLead } from '@/types/inbox';
import { Loader2, MessageSquare, UserPlus, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ModalCliente from '@/app/comercial/cartera/components/modal-cliente';
import { Cliente } from '@/types/cliente';

import Cookies from 'js-cookie';

export default function InboxPage() {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        try {
            const userDataStr = Cookies.get('user_data');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.roles.includes('JEFE_COMERCIAL')) {
                    setRole('jefa_comercial');
                }
            }
        } catch (e) { console.error(e); }
    }, []);

    const { leads, isLoading, isError, refetch, convertMutation, discardMutation } = useInbox(role || undefined);

    // Convert Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<InboxLead | null>(null);

    const handleOpenConvert = (lead: InboxLead) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleClienteCreado = async (ruc: string, razonSocial: string, clienteId?: number) => {
        if (selectedLead && clienteId) {
            try {
                await convertMutation.mutateAsync({ id: selectedLead.id, clienteId });
                toast.success('Lead convertido y archivado');
                setIsModalOpen(false);
                setSelectedLead(null);
            } catch {
                toast.error('Error al archivar lead');
            }
        }
    };

    const handleDiscard = async (id: number) => {
        try {
            await discardMutation.mutateAsync(id);
            toast.success('Lead descartado');
        } catch {
            toast.error('Error al descartar');
        }
    };

    const isJefa = role === 'jefa_comercial';

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isJefa ? 'Buzón Global (Jefa Comercial)' : 'Buzón de Leads'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {isJefa ? 'Supervisión de todos los mensajes entrantes' : 'Gestiona los mensajes entrantes de WhatsApp'}
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Actualizar"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            ) : isError ? (
                <div className="text-center py-20 text-red-500">
                    Error al cargar leads
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <MessageSquare className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-gray-500 font-medium">No hay leads pendientes</p>
                    <p className="text-sm text-gray-400">¡Todo al día!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {leads.map((lead) => (
                        <div key={lead.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-800 text-lg">
                                        {lead.nombre_whatsapp || 'Desconocido'}
                                    </span>
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-mono">
                                        {lead.telefono}
                                    </span>
                                    {isJefa && lead.nombre_asignado && (
                                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                            Asignado a: {lead.nombre_asignado}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {new Date(lead.fecha_recepcion).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                    {lead.mensaje_inicial}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDiscard(lead.id)}
                                    className="px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-gray-200 hover:border-red-200"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={() => handleOpenConvert(lead)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all"
                                >
                                    <UserPlus size={16} />
                                    Convertir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Conversión (Crear Cliente) */}
            {selectedLead && (
                <ModalCliente
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedLead(null); }}
                    clienteToEdit={null} // Es nuevo
                    onClienteCreado={handleClienteCreado}
                    initialData={{
                        razon_social: selectedLead.nombre_whatsapp || '',
                        ruc: '', // No tenemos RUC, el usuario debe ingresarlo
                        // telefono: selectedLead.telefono // TODO: Pasar telefono si ModalCliente lo soporta
                    }}
                />
            )}
        </div>
    );
}
