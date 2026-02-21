import React, { useEffect, useRef } from 'react';
import { ChatConversationPreview } from '@/types/chat';
import { useChatMessages, useChatActions } from '@/hooks/comercial/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { Bot, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    selectedConv: ChatConversationPreview | null;
}

export default function ChatWindow({ selectedConv }: Props) {
    const { data: messages = [], isLoading } = useChatMessages(selectedConv?.inbox_id || null);
    const { takeChat, markAsRead } = useChatActions();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when messages load/change
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Mark as read whenever selected convo changes or messages load
        if (selectedConv?.inbox_id && selectedConv.mensajes_no_leidos > 0) {
            markAsRead.mutate(selectedConv.inbox_id);
        }
    }, [selectedConv?.inbox_id, selectedConv?.mensajes_no_leidos, messages.length]);

    const handleTakeChat = async () => {
        if (!selectedConv) return;
        try {
            await takeChat.mutateAsync(selectedConv.inbox_id);
            toast.success('Chat tomado en modo ASESOR');
        } catch {
            toast.error('Error al tomar el chat');
        }
    };

    if (!selectedConv) {
        return (
            <div className="h-full flex items-center justify-center bg-[#f0f2f5]">
                <div className="text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                        <Bot size={48} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-medium text-gray-600">SGI WhatsApp</h2>
                    <p className="text-gray-400 mt-2">Selecciona un chat para comenzar a enviar mensajes</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#efeae2] relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_686b98c9fdffef3f63127edcd68c5b36.png")', opacity: 0.95 }}>
            {/* Header */}
            <div className="h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">
                        {selectedConv.nombre_whatsapp?.charAt(0).toUpperCase() || selectedConv.telefono.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-800 leading-tight">
                            {selectedConv.nombre_whatsapp || 'Cliente Nuevo'}
                        </h2>
                        <span className="text-xs text-gray-500 font-mono">
                            {selectedConv.telefono} • Modo: {selectedConv.modo}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedConv.modo === 'BOT' && (
                        <button
                            onClick={handleTakeChat}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                        >
                            <UserPlus size={16} />
                            Tomar Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:px-[10%] space-y-3 z-0">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <div className="bg-white/80 p-2 rounded-full shadow-sm">
                            <Loader2 className="animate-spin text-emerald-500" size={24} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center my-4">
                            <span className="bg-[#fff9c4] text-[#8a7231] px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm uppercase tracking-wide">
                                Inicio de conversación
                            </span>
                        </div>
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            {selectedConv.modo === 'ASESOR' ? (
                <ChatInput inboxId={selectedConv.inbox_id} disabled={false} />
            ) : (
                <div className="bg-white p-3 text-center text-sm text-gray-500 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
                    <p>El chatbot está gestionando esta conversación. Haz clic en "Tomar Chat" para responder.</p>
                </div>
            )}
        </div>
    );
}
