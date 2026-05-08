'use client';

import React from 'react';
import { useConversaciones } from '@/hooks/comercial/useSupervision';
import { EvoInstancia, EvoConversacion } from '@/types/supervision';
import { MessageCircle, Users, User, Loader2 } from 'lucide-react';

interface ConversacionPanelProps {
    instancia: EvoInstancia | null;
    selectedConvId: number | null;
    onSelect: (conv: EvoConversacion) => void;
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) {
        return date.toLocaleDateString('es-PE', { weekday: 'short' });
    }
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
}

function extractPhone(jid: string): string {
    return jid.split('@')[0] || jid;
}

export default function ConversacionPanel({
    instancia,
    selectedConvId,
    onSelect,
}: ConversacionPanelProps) {
    const { data, isLoading } = useConversaciones(instancia?.id ?? null);
    const conversaciones = data?.items || [];

    return (
        <div className="w-96 min-w-[340px] flex flex-col border-r border-slate-200 bg-white">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-azul-100 flex items-center justify-center text-azul-500 font-bold text-xs">
                        {instancia?.nombre_comercial?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 truncate">
                            {instancia?.nombre_comercial || instancia?.instance_name}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {data?.total || 0} conversaciones
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Loader2 size={20} className="animate-spin mb-2" />
                        <span className="text-xs">Cargando chats...</span>
                    </div>
                ) : conversaciones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <MessageCircle size={28} className="mb-2 opacity-40" />
                        <p className="text-xs">Sin conversaciones registradas</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {conversaciones.map((conv) => {
                            const isSelected = selectedConvId === conv.id;
                            const displayName =
                                conv.nombre_contacto || extractPhone(conv.remote_jid);

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelect(conv)}
                                    className={`
                                        flex items-start gap-3 px-4 py-3 cursor-pointer transition-all
                                        ${isSelected
                                            ? 'bg-azul-50 border-l-3 border-naranja-500'
                                            : 'hover:bg-slate-50 border-l-3 border-transparent'
                                        }
                                    `}
                                >
                                    {/* Avatar */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        {conv.es_grupo ? <Users size={16} /> : <User size={16} />}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-800 truncate">
                                                {displayName}
                                            </span>
                                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                                {formatTime(conv.ultimo_mensaje_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-xs text-slate-500 truncate pr-2">
                                                {conv.ultimo_mensaje || 'Sin mensajes'}
                                            </p>
                                            {conv.mensajes_no_leidos > 0 && (
                                                <span className="flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full px-1.5">
                                                    {conv.mensajes_no_leidos > 99 ? '99+' : conv.mensajes_no_leidos}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
