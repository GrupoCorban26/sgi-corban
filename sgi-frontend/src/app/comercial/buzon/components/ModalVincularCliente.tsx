'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Check, Loader2, Link2 } from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
import { useClientes } from '@/hooks/comercial/useClientes';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClienteVinculado: (clienteId: number) => Promise<void>;
}

function ModalContent({ onClienteVinculado }: { onClienteVinculado: (clienteId: number) => Promise<void> }) {
    const { handleClose } = useModalContext();
    const { user } = useCurrentUser();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounce de búsqueda (300ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setSelectedCliente(null); // Resetear selección al buscar de nuevo
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Consultar clientes filtrados por el comercial actual (o equipo)
    const { clientes, isLoading } = useClientes(
        debouncedSearch,
        null,
        user?.id ?? null,
        null,
        1,
        25
    );

    const handleConfirm = async () => {
        if (!selectedCliente) return;
        setIsSubmitting(true);
        try {
            await onClienteVinculado(selectedCliente.id);
            handleClose();
        } catch (error) {
            // El error es manejado en la callback del padre (ChatLayout)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <ModalHeader 
                icon={<Link2 size={20} className="text-indigo-600" />} 
                title="Vincular con Cliente Existente" 
            />

            <div className="p-5 space-y-4 flex-1 flex flex-col min-h-[350px] max-h-[60vh]">
                <p className="text-xs text-gray-500">
                    Busca un cliente registrado en tu cartera por su Razón Social o RUC para asociar esta conversación de WhatsApp.
                </p>

                {/* Input de búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Razón Social o RUC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </div>

                {/* Lista de clientes */}
                <div className="flex-1 overflow-y-auto min-h-[200px] border border-gray-100 rounded-xl p-2 bg-slate-50/50 space-y-2">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center py-10">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                        </div>
                    ) : clientes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                            <Building2 className="text-gray-300 mb-2" size={32} />
                            <p className="text-sm font-medium text-gray-500">No se encontraron clientes</p>
                            <p className="text-xs text-gray-400 mt-1">Verifica la búsqueda o que el cliente esté en tu cartera.</p>
                        </div>
                    ) : (
                        clientes.map((cliente) => {
                            const isSelected = selectedCliente?.id === cliente.id;
                            return (
                                <div
                                    key={cliente.id}
                                    onClick={() => !isSubmitting && setSelectedCliente(cliente)}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                                            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="min-w-0 pr-3">
                                        <h4 className="text-sm font-bold text-gray-800 truncate">
                                            {cliente.razon_social}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold text-gray-400">
                                                RUC: {cliente.ruc || 'Sin RUC'}
                                            </span>
                                            {cliente.estado_nombre && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                                    {cliente.estado_nombre}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                                        isSelected
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-gray-200 bg-white'
                                    }`}>
                                        {isSelected && <Check size={12} />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <ModalFooter>
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="cursor-pointer flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white hover:border-gray-400 disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedCliente || isSubmitting}
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Vinculando...
                        </>
                    ) : (
                        'Vincular Cliente'
                    )}
                </button>
            </ModalFooter>
        </>
    );
}

export default function ModalVincularCliente({ isOpen, onClose, onClienteVinculado }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalContent onClienteVinculado={onClienteVinculado} />
        </ModalBase>
    );
}
