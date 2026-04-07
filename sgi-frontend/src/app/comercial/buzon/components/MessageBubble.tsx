import React, { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck, Download, FileText, Headphones, Bot } from 'lucide-react';

interface Props {
    msg: ChatMessage;
}

export default function MessageBubble({ msg }: Props) {
    const isOut = msg.direccion === 'SALIENTE';
    const isBot = msg.remitente_tipo === 'BOT';
    const [imgError, setImgError] = useState(false);

    const getBubbleClass = () => {
        if (!isOut) return 'bg-white shadow-sm';
        if (isBot) return 'bg-blue-50/90 border border-blue-100/60 shadow-sm';
        return 'bg-[#d9fdd3] shadow-sm';
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
        if (msg.media_url.startsWith('http')) return msg.media_url;
        // Servir media a través del proxy para no exponer la URL del backend
        return `/api/proxy${msg.media_url}`;
    };

    const renderMediaContent = () => {
        const mediaUrl = getMediaUrl();

        switch (msg.tipo_contenido) {
            case 'image':
                if (!mediaUrl || imgError) {
                    return (
                        <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg text-slate-500 text-sm">
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
                        <Headphones size={18} className="text-slate-500 shrink-0" />
                        <audio src={mediaUrl} controls className="w-full h-8" preload="metadata" />
                    </div>
                );

            case 'document':
                return (
                    <a
                        href={mediaUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-2.5 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-slate-700 truncate flex-1">
                            {msg.contenido || 'Documento'}
                        </span>
                        <Download size={14} className="text-slate-400 shrink-0" />
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
        <div className={`flex w-full mb-1.5 ${getAlignment()}`}>
            <div className={`
                relative max-w-[85%] md:max-w-[65%] px-3 pt-2 pb-1 rounded-2xl
                ${getBubbleClass()}
                ${!isOut ? 'rounded-tl-md' : 'rounded-tr-md'}
            `}>

                {/* Identificador del bot */}
                {isBot && (
                    <div className="flex items-center gap-1 mb-0.5">
                        <Bot size={10} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                            Corby Bot
                        </span>
                    </div>
                )}

                {/* Contenido multimedia */}
                {hasMedia && (
                    <div className="mb-1.5">
                        {renderMediaContent()}
                    </div>
                )}

                {/* Contenido de texto */}
                {(!hasMedia || hasCaption) && (
                    <p className="text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {msg.contenido}
                    </p>
                )}

                {/* Footer con hora y estado de lectura */}
                <div className={`
                    flex items-center justify-end gap-1 mt-0.5 -mr-1
                    ${!hasMedia && msg.contenido.length < 25 ? 'float-right ml-3 -mb-0.5 relative top-1' : ''}
                `}>
                    <span className="text-[10px] text-slate-400 font-medium select-none">
                        {formatTime(msg.created_at)}
                    </span>
                    {isOut && (
                        <span className={`flex items-center ${msg.leido ? 'text-blue-500' : 'text-slate-400'}`}>
                            {msg.leido
                                ? <CheckCheck size={14} strokeWidth={2.5} />
                                : <Check size={14} strokeWidth={2.5} />
                            }
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
