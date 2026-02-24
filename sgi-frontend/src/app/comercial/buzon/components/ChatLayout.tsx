import React, { useState, useMemo } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import LeadInfoPanel from './LeadInfoPanel';
import { ChatConversationPreview } from '@/types/chat';
import { useChatConversations } from '@/hooks/comercial/useChat';
import { useInbox } from '@/hooks/comercial/useInbox';
import ModalCliente from '../../cartera/components/modal-cliente';
import { toast } from 'sonner';

export default function ChatLayout() {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
    const { data: conversations = [] } = useChatConversations();
    const { convertMutation } = useInbox();

    // Derived state ensures selectedConv always has the freshest data
    const selectedConv = useMemo(() => {
        if (!selectedId) return null;
        return conversations.find(c => c.inbox_id === selectedId) || null;
    }, [selectedId, conversations]);

    const handleClienteCreado = async (ruc: string, razonSocial: string, newClienteId?: number) => {
        if (!selectedId || !newClienteId) return;
        try {
            await convertMutation.mutateAsync({ id: selectedId, clienteId: newClienteId });
            toast.success('Lead convertido y enlazado exitosamente');
            setIsModalClienteOpen(false);
            setSelectedId(null);
        } catch (error) {
            toast.error('Cliente creado pero hubo un error al enlazar el lead.');
        }
    };

    return (
        <div className="flex h-full w-full bg-white divide-x divide-gray-200 shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {/* 1. Panel Izquierdo: Lista de Conversaciones */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] h-full flex flex-col bg-gray-50/50">
                <ConversationList
                    selectedId={selectedId}
                    onSelect={(conv) => setSelectedId(conv.inbox_id)}
                />
            </div>

            {/* 2. Panel Central: Ventana de Chat */}
            <div className="flex-1 h-full min-w-0 bg-[#EFEAE2]">
                <ChatWindow selectedConv={selectedConv} />
            </div>

            {/* 3. Panel Derecho: Info del Lead (Solo visible si hay chat seleccionado) */}
            {selectedConv && (
                <div className="w-1/4 min-w-[300px] max-w-[360px] h-full bg-white hidden lg:block overflow-y-auto">
                    <LeadInfoPanel
                        selectedConv={selectedConv}
                        onChangeConv={(conv) => setSelectedId(conv?.inbox_id || null)}
                        onCerrarClick={() => setIsModalClienteOpen(true)}
                    />
                </div>
            )}

            <ModalCliente
                isOpen={isModalClienteOpen}
                onClose={() => setIsModalClienteOpen(false)}
                onClienteCreado={handleClienteCreado}
                initialData={{
                    razon_social: selectedConv?.nombre_whatsapp || '',
                    nombre_comercial: selectedConv?.nombre_whatsapp || ''
                }}
            />
        </div>
    );
}
