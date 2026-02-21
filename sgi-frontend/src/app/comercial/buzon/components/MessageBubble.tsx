import React from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';

interface Props {
    msg: ChatMessage;
}

export default function MessageBubble({ msg }: Props) {
    const isOut = msg.direccion === 'SALIENTE';
    const isBot = msg.remitente_tipo === 'BOT';

    const getBubbleClass = () => {
        if (!isOut) return 'bg-white rounded-tr-xl rounded-bl-xl rounded-br-xl rounded-tl-sm'; // Client message (Whatsapp light gray-ish, let's use white with shadow)
        if (isBot) return 'bg-blue-50/90 rounded-tl-xl rounded-bl-xl rounded-br-sm rounded-tr-xl border border-blue-100'; // Bot message
        return 'bg-[#dcf8c6] rounded-tl-xl rounded-bl-xl rounded-br-sm rounded-tr-xl'; // Commercial message (WhatsApp green)
    };

    const getAlignment = () => {
        if (!isOut) return 'justify-start';
        return 'justify-end';
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex w-full mb-3 ${getAlignment()}`}>
            <div className={`relative max-w-[85%] md:max-w-[70%] px-3 pt-2 pb-1 shadow-sm ${getBubbleClass()}`}>

                {/* Identifier for bot */}
                {isBot && (
                    <div className="text-[10px] font-bold text-blue-800 mb-0.5 uppercase tracking-wider flex items-center gap-1">
                        🤖 Bot Corban
                    </div>
                )}

                {/* Content */}
                <p className="text-[14px] text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {msg.contenido}
                </p>

                {/* Footer with time and read receipt */}
                <div className={`flex items-center justify-end gap-1 mt-1 -mr-1 ${msg.contenido.length < 20 ? 'absolute bottom-1 right-2' : ''}`}>
                    <span className="text-[10px] text-gray-500 font-medium select-none">
                        {formatTime(msg.created_at)}
                    </span>
                    {isOut && (
                        <span className={`text-[12px] flex items-center ${msg.leido ? 'text-blue-500' : 'text-gray-400'}`}>
                            {msg.leido ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
