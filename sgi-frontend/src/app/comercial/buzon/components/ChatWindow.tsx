import React, { useEffect, useRef } from 'react';
import { ChatConversationPreview } from '@/types/chat';
import { useChatMessages, useChatActions } from '@/hooks/comercial/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ArrowLeft, Bot, UserPlus, Loader2, Info, MessageSquare, Headset } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    selectedConv: ChatConversationPreview | null;
    onBack: () => void;
    onToggleInfo: () => void;
    showInfoPanel: boolean;
}

export default function ChatWindow({ selectedConv, onBack, onToggleInfo, showInfoPanel }: Props) {
    const { data: messages = [], isLoading } = useChatMessages(selectedConv?.inbox_id || null);
    const { takeChat, markAsRead } = useChatActions();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
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

    // Estado vacío - sin conversación seleccionada
    if (!selectedConv) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center max-w-sm px-6">
                    <div className="relative inline-block mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-200/50 rotate-3">
                            <MessageSquare size={40} className="text-white -rotate-3" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-700 mb-2">SGI WhatsApp</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Selecciona una conversación de la lista para ver los mensajes y gestionar tus leads.
                    </p>
                </div>
            </div>
        );
    }

    // Datos del avatar
    const initial = (selectedConv.nombre_whatsapp || selectedConv.telefono).charAt(0).toUpperCase();
    const avatarColors = [
        'from-emerald-400 to-teal-500',
        'from-blue-400 to-indigo-500',
        'from-violet-400 to-purple-500',
        'from-rose-400 to-pink-500',
        'from-amber-400 to-orange-500',
        'from-cyan-400 to-blue-500',
    ];
    const colorIndex = (selectedConv.nombre_whatsapp || selectedConv.telefono).charCodeAt(0) % avatarColors.length;

    return (
        <div className="h-full flex flex-col bg-[#efeae2] relative">
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 opacity-[0.04] bg-repeat pointer-events-none z-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Header */}
            <div className="h-[60px] px-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Botón volver en mobile */}
                    <button
                        onClick={onBack}
                        className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className={`w-10 h-10 bg-gradient-to-br ${avatarColors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0`}>
                        {initial}
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-semibold text-slate-800 text-sm leading-tight truncate">
                            {selectedConv.nombre_whatsapp || 'Cliente Nuevo'}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono truncate">
                                {selectedConv.telefono}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={`
                                inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded
                                ${selectedConv.modo === 'BOT'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-purple-50 text-purple-600'
                                }
                            `}>
                                {selectedConv.modo === 'BOT'
                                    ? <><Bot size={10} /> Bot</>
                                    : <><Headset size={10} /> Asesor</>
                                }
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {selectedConv.modo === 'BOT' && (
                        <button
                            onClick={handleTakeChat}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 flex items-center gap-1.5 hover:shadow-md"
                        >
                            <UserPlus size={14} />
                            <span className="hidden sm:inline">Tomar Chat</span>
                        </button>
                    )}

                    <button
                        onClick={onToggleInfo}
                        className={`
                            p-2 rounded-lg transition-all duration-200
                            ${showInfoPanel
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'hover:bg-slate-100 text-slate-500'
                            }
                        `}
                        title="Info del lead"
                    >
                        <Info size={18} />
                    </button>
                </div>
            </div>

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-[8%] lg:px-[12%] space-y-1 z-[1]">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                            <Loader2 className="animate-spin text-emerald-500" size={18} />
                            <span className="text-xs text-slate-500">Cargando mensajes...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center my-4">
                            <span className="bg-white/80 backdrop-blur-sm text-slate-500 px-4 py-1.5 rounded-lg text-[11px] font-medium shadow-sm inline-flex items-center gap-1.5">
                                🔒 Los mensajes están cifrados de extremo a extremo
                            </span>
                        </div>
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Área de input */}
            {selectedConv.modo === 'ASESOR' ? (
                <ChatInput inboxId={selectedConv.inbox_id} disabled={false} />
            ) : (
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 text-center border-t border-slate-200 z-10 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <Bot size={16} className="text-blue-500" />
                        <p className="text-sm text-slate-500">
                            El chatbot gestiona esta conversación.
                            <button
                                onClick={handleTakeChat}
                                className="text-emerald-600 font-semibold hover:underline ml-1"
                            >
                                Tomar chat
                            </button>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
