import React from 'react';
import { ChatConversationPreview } from '@/types/chat';
import { Bot, Headset } from 'lucide-react';

interface Props {
    conv: ChatConversationPreview;
    isSelected: boolean;
    onClick: () => void;
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    NUEVO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    PENDIENTE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    EN_GESTION: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    SEGUIMIENTO: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    COTIZADO: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const ESTADO_LABELS: Record<string, string> = {
    NUEVO: 'Nuevo',
    PENDIENTE: 'Pendiente',
    EN_GESTION: 'En gestión',
    SEGUIMIENTO: 'Seguimiento',
    COTIZADO: 'Cotizado',
};

export default function ConversationItem({ conv, isSelected, onClick }: Props) {
    const timeAgo = (dateStr: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 60000;
        if (diff < 1) return 'ahora';
        if (diff < 60) return `${Math.floor(diff)}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        if (diff < 10080) return `${Math.floor(diff / 1440)}d`;
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    const initial = (conv.nombre_whatsapp || conv.telefono).charAt(0).toUpperCase();
    const colors = ESTADO_COLORS[conv.estado] || ESTADO_COLORS.PENDIENTE;
    const estadoLabel = ESTADO_LABELS[conv.estado] || conv.estado.replace('_', ' ');

    // Colores de avatar basados en el nombre
    const avatarColors = [
        'from-emerald-400 to-teal-500',
        'from-blue-400 to-indigo-500',
        'from-violet-400 to-purple-500',
        'from-rose-400 to-pink-500',
        'from-amber-400 to-orange-500',
        'from-cyan-400 to-blue-500',
    ];
    const colorIndex = (conv.nombre_whatsapp || conv.telefono).charCodeAt(0) % avatarColors.length;
    const avatarGradient = avatarColors[colorIndex];

    return (
        <div
            onClick={onClick}
            className={`
                cursor-pointer px-3 py-3 transition-all duration-150 group relative
                ${isSelected
                    ? 'bg-emerald-50/80'
                    : 'hover:bg-slate-50 active:bg-slate-100'
                }
            `}
        >
            {/* Indicador lateral activo */}
            {isSelected && (
                <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-emerald-500 rounded-r-full" />
            )}

            <div className="flex gap-3 items-start">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className={`
                        w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient}
                        flex items-center justify-center text-white font-bold text-lg shadow-sm
                    `}>
                        {initial}
                    </div>
                    {/* Indicador de modo */}
                    <div className={`
                        absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white
                        flex items-center justify-center
                        ${conv.modo === 'BOT' ? 'bg-blue-500' : 'bg-purple-500'}
                    `}>
                        {conv.modo === 'BOT'
                            ? <Bot size={10} className="text-white" />
                            : <Headset size={10} className="text-white" />
                        }
                    </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h3 className={`font-semibold truncate text-sm leading-tight ${isSelected ? 'text-emerald-800' : 'text-slate-800'
                            }`}>
                            {conv.nombre_whatsapp || conv.telefono}
                        </h3>
                        <span className={`text-[11px] flex-shrink-0 ${conv.mensajes_no_leidos > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                            }`}>
                            {timeAgo(conv.ultimo_mensaje_at)}
                        </span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                        <p className="text-[13px] text-slate-500 truncate flex-1 min-w-0 leading-snug">
                            {conv.ultimo_mensaje_preview || (
                                <span className="italic text-slate-400">Inició conversación</span>
                            )}
                        </p>
                        {conv.mensajes_no_leidos > 0 && (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                {conv.mensajes_no_leidos > 99 ? '99+' : conv.mensajes_no_leidos}
                            </span>
                        )}
                    </div>

                    {/* Badge de estado + Asesor asignado */}
                    <div className="mt-1.5 flex items-center gap-2">
                        <span className={`
                            inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold
                            ${colors.bg} ${colors.text}
                        `}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {estadoLabel}
                        </span>
                        {conv.nombre_asignado && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate">
                                <Headset size={10} className="flex-shrink-0" />
                                {conv.nombre_asignado}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
