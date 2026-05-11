'use client';

import React, { useEffect, useRef } from 'react';
import { useMensajes } from '@/hooks/comercial/useSupervision';
import { EvoConversacion, EvoInstancia, EvoMensaje } from '@/types/supervision';
import {
    MessageCircle, Loader2, Image, Mic, Video,
    FileText, Sticker, Eye
} from 'lucide-react';

interface MensajePanelProps {
    conversacion: EvoConversacion | null;
    instancia: EvoInstancia | null;
}

function formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

const tipoIcons: Record<string, React.ReactNode> = {
    image: <Image size={13} className="text-blue-500" />,
    audio: <Mic size={13} className="text-purple-500" />,
    video: <Video size={13} className="text-pink-500" />,
    document: <FileText size={13} className="text-amber-500" />,
    sticker: <Sticker size={13} className="text-green-500" />,
};

function MessageBubble({ msg }: { msg: EvoMensaje }) {
    const isMe = msg.from_me;
    const isReaction = msg.contenido?.startsWith('[Reacción:');
    const icon = msg.tipo !== 'text' ? tipoIcons[msg.tipo] : null;

    // Si es una reacción, la estilizamos como una pequeña píldora en lugar de un globo gigante
    if (isReaction) {
        const emoji = msg.contenido?.replace('[Reacción: ', '').replace(']', '');
        return (
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shadow-sm
                    ${isMe ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-100' : 'bg-white/80 text-slate-500 border border-slate-100'}
                `}>
                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                        {isMe ? 'Reaccionaste con' : 'Reaccionó con'}
                    </span>
                    <span className="text-base">{emoji}</span>
                    <span className="text-[9px] opacity-50 ml-1">{formatTimestamp(msg.timestamp)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5 group relative`}>
            <div
                className={`
                    relative max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm transition-all duration-200
                    ${isMe
                        ? 'bg-emerald-50 text-emerald-900 rounded-br-sm border border-emerald-100'
                        : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                    }
                `}
            >
                {/* Nombre participante si es grupo */}
                {!isMe && msg.participant_name && (
                    <div className="text-xs font-semibold text-emerald-600 mb-0.5">
                        {msg.participant_name}
                    </div>
                )}

                {/* Tipo indicator */}
                {icon && (
                    <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        {icon}
                        <span className="text-xs capitalize text-slate-500">{msg.tipo}</span>
                    </div>
                )}

                {/* Contenido */}
                <p className="whitespace-pre-wrap break-words">{msg.contenido || `[${msg.tipo}]`}</p>

                {/* Timestamp */}
                <div className={`flex items-center justify-end gap-1 mt-1`}>
                    <span className="text-[10px] text-slate-400">{formatTimestamp(msg.timestamp)}</span>
                </div>

                {/* Reacción flotante estilo WhatsApp */}
                {msg.reaccion && (
                    <div className={`
                        absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} 
                        bg-white border border-slate-200 rounded-full px-1.5 py-0.5 
                        text-xs shadow-sm flex items-center justify-center 
                        z-10
                    `}>
                        {msg.reaccion}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MensajePanel({ conversacion, instancia }: MensajePanelProps) {
    const { data, isLoading } = useMensajes(conversacion?.id ?? null);
    const mensajes = data?.items || [];
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al último mensaje al cargar
    useEffect(() => {
        if (scrollRef.current && mensajes.length > 0) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [mensajes.length]);

    if (!conversacion) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Eye size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium text-slate-500">Modo Supervisión</p>
                <p className="text-xs mt-1 text-slate-400 text-center max-w-xs">
                    Selecciona una conversación para ver los mensajes.
                    Solo lectura.
                </p>
            </div>
        );
    }

    // Agrupar mensajes por fecha
    const sortedMessages = [...mensajes].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const groupedByDate: { date: string; messages: EvoMensaje[] }[] = [];
    let currentDate = '';
    for (const msg of sortedMessages) {
        const msgDate = new Date(msg.timestamp).toDateString();
        if (msgDate !== currentDate) {
            currentDate = msgDate;
            groupedByDate.push({ date: msg.timestamp, messages: [msg] });
        } else {
            groupedByDate[groupedByDate.length - 1].messages.push(msg);
        }
    }

    const rawPhone = conversacion.remote_jid.split('@')[0];
    const isGroup = conversacion.remote_jid.includes('@g.us');
    const isRealPhone = !isGroup && /^\d{9,13}$/.test(rawPhone);
    const formattedPhone = isRealPhone ? `+${rawPhone}` : null;

    const contactName = isGroup
        ? (conversacion.nombre_contacto || 'Grupo sin nombre')
        : conversacion.nombre_contacto && formattedPhone
            ? `${conversacion.nombre_contacto} - ${formattedPhone}`
            : conversacion.nombre_contacto || formattedPhone || rawPhone;

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">{contactName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {instancia?.nombre_comercial && (
                                <span>
                                    WhatsApp de{' '}
                                    <span className="text-naranja-500 font-medium">
                                        {instancia.nombre_comercial}
                                    </span>
                                </span>
                            )}
                            {data?.total ? ` · ${data.total} mensajes` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full">
                        <Eye size={12} />
                        Solo lectura
                    </div>
                </div>
            </div>

            {/* Mensajes */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 bg-[#f0f2f5]"
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <span className="text-xs">Cargando mensajes...</span>
                    </div>
                ) : sortedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <MessageCircle size={28} className="mb-2 opacity-40" />
                        <p className="text-xs">Sin mensajes registrados</p>
                    </div>
                ) : (
                    groupedByDate.map((group, gi) => (
                        <div key={gi}>
                            {/* Separador de fecha */}
                            <div className="flex items-center justify-center my-4">
                                <span className="bg-white text-slate-500 text-xs px-3 py-1 rounded-full shadow-sm border border-slate-100">
                                    {formatDateHeader(group.date)}
                                </span>
                            </div>
                            {group.messages.map((msg) => (
                                <MessageBubble key={msg.id} msg={msg} />
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <Eye size={14} />
                    <span>Vista de supervisión — no puedes escribir mensajes</span>
                </div>
            </div>
        </div>
    );
}
