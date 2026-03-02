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
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
    const { data: conversations = [] } = useChatConversations();
    const { convertMutation } = useInbox();

    const selectedConv = useMemo(() => {
        if (!selectedId) return null;
        return conversations.find(c => c.inbox_id === selectedId) || null;
    }, [selectedId, conversations]);

    const handleSelectConv = (conv: ChatConversationPreview) => {
        setSelectedId(conv.inbox_id);
        setShowInfoPanel(false);
    };

    const handleBack = () => {
        setSelectedId(null);
        setShowInfoPanel(false);
    };

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
        <div className="flex h-full w-full bg-slate-100">
            {/* Panel Izquierdo: Lista de Conversaciones */}
            <div className={`
                w-full md:w-[380px] lg:w-[400px] md:min-w-[340px] h-full flex-shrink-0
                border-r border-slate-200
                ${selectedId ? 'hidden md:flex' : 'flex'}
                flex-col
            `}>
                <ConversationList
                    selectedId={selectedId}
                    onSelect={handleSelectConv}
                />
            </div>

            {/* Panel Central: Ventana de Chat */}
            <div className={`
                flex-1 h-full min-w-0
                ${!selectedId ? 'hidden md:flex' : 'flex'}
                flex-col
            `}>
                <ChatWindow
                    selectedConv={selectedConv}
                    onBack={handleBack}
                    onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
                    showInfoPanel={showInfoPanel}
                />
            </div>

            {/* Panel Derecho: Info del Lead */}
            {selectedConv && showInfoPanel && (
                <>
                    {/* Overlay móvil */}
                    <div
                        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                        onClick={() => setShowInfoPanel(false)}
                    />
                    <div className={`
                        fixed right-0 top-0 bottom-0 w-[340px] z-50
                        lg:relative lg:z-0 lg:w-[340px] lg:min-w-[320px]
                        h-full bg-white border-l border-slate-200 shadow-xl lg:shadow-none
                        transition-transform duration-300 ease-out
                    `}>
                        <LeadInfoPanel
                            selectedConv={selectedConv}
                            onChangeConv={(conv) => setSelectedId(conv?.inbox_id || null)}
                            onCerrarClick={() => setIsModalClienteOpen(true)}
                            onClose={() => setShowInfoPanel(false)}
                        />
                    </div>
                </>
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
