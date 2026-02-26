import React, { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck, Download, FileText, Headphones, Video } from 'lucide-react';

interface Props {
    msg: ChatMessage;
}

// URL base del backend para servir archivos
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

export default function MessageBubble({ msg }: Props) {
    const isOut = msg.direccion === 'SALIENTE';
    const isBot = msg.remitente_tipo === 'BOT';
    const [imgError, setImgError] = useState(false);

    const getBubbleClass = () => {
        if (!isOut) return 'bg-white rounded-tr-xl rounded-bl-xl rounded-br-xl rounded-tl-sm'; // Client message
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

    const getMediaUrl = () => {
        if (!msg.media_url) return null;
        // Si ya es URL absoluta, usarla directamente
        if (msg.media_url.startsWith('http')) return msg.media_url;
        // Si es ruta relativa, construir URL completa
        return `${API_BASE}${msg.media_url}`;
    };

    const renderMediaContent = () => {
        const mediaUrl = getMediaUrl();

        switch (msg.tipo_contenido) {
            case 'image':
                if (!mediaUrl || imgError) {
                    return (
                        <div className="flex items-center gap-2 py-2 px-3 bg-gray-100 rounded-lg text-gray-500 text-sm">
                            <FileText size={16} />
                            <span>📷 Imagen no disponible</span>
                        </div>
                    );
                }
                return (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                            src={mediaUrl}
                            alt={msg.contenido || 'Imagen'}
                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '300px' }}
                            onError={() => setImgError(true)}
                            loading="lazy"
                        />
                    </a>
                );

            case 'video':
                if (!mediaUrl) return null;
                return (
                    <div className="relative">
                        <video
                            src={mediaUrl}
                            controls
                            className="max-w-full rounded-lg"
                            style={{ maxHeight: '300px' }}
                            preload="metadata"
                        />
                    </div>
                );

            case 'audio':
                if (!mediaUrl) return null;
                return (
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Headphones size={18} className="text-gray-500 shrink-0" />
                        <audio src={mediaUrl} controls className="w-full h-8" preload="metadata" />
                    </div>
                );

            case 'document':
                return (
                    <a
                        href={mediaUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <FileText size={20} className="text-blue-500 shrink-0" />
                        <span className="text-sm text-gray-700 truncate flex-1">
                            {msg.contenido || 'Documento'}
                        </span>
                        <Download size={16} className="text-gray-400 shrink-0" />
                    </a>
                );

            case 'sticker':
                if (!mediaUrl || imgError) return null;
                return (
                    <img
                        src={mediaUrl}
                        alt="Sticker"
                        className="max-w-[150px] rounded"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                );

            default:
                return null;
        }
    };

    const hasMedia = msg.tipo_contenido && msg.tipo_contenido !== 'text' && msg.media_url;
    const hasCaption = hasMedia && msg.contenido && !['📷 Imagen', '🎥 Video', '🎵 Audio', '📄 Documento', '🪄 Sticker'].includes(msg.contenido);

    return (
        <div className={`flex w-full mb-3 ${getAlignment()}`}>
            <div className={`relative max-w-[85%] md:max-w-[70%] px-3 pt-2 pb-1 shadow-sm ${getBubbleClass()}`}>

                {/* Identifier for bot */}
                {isBot && (
                    <div className="text-[10px] font-bold text-blue-800 mb-0.5 uppercase tracking-wider flex items-center gap-1">
                        🤖 Bot Corban
                    </div>
                )}

                {/* Media content */}
                {hasMedia && (
                    <div className="mb-1">
                        {renderMediaContent()}
                    </div>
                )}

                {/* Text content - show caption for media or regular text */}
                {(!hasMedia || hasCaption) && (
                    <p className="text-[14px] text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {msg.contenido}
                    </p>
                )}

                {/* Footer with time and read receipt */}
                <div className={`flex items-center justify-end gap-1 mt-1 -mr-1 ${!hasMedia && msg.contenido.length < 20 ? 'absolute bottom-1 right-2' : ''}`}>
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
