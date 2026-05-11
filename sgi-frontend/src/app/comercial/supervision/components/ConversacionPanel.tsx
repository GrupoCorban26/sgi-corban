'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useConversaciones } from '@/hooks/comercial/useSupervision';
import { EvoInstancia, EvoConversacion } from '@/types/supervision';
import { MessageCircle, Users, User, Loader2, Search, X } from 'lucide-react';

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

function extractPhone(jid: string): string | null {
    const raw = jid.split('@')[0] || jid;
    // Los JIDs de grupo (@g.us) son IDs internos, no teléfonos
    if (jid.includes('@g.us')) return null;
    // Solo formatear como teléfono si parece real (9-15 dígitos)
    if (/^\d{9,15}$/.test(raw)) {
        return `+${raw}`;
    }
    return raw;
}

function getDisplayName(conv: EvoConversacion): string {
    const phone = extractPhone(conv.remote_jid);

    if (conv.es_grupo) {
        // Grupos: solo nombre, sin ID interno
        return conv.nombre_contacto || 'Grupo sin nombre';
    }

    // Chat individual: [nombre] - [teléfono] o solo [teléfono]
    if (conv.nombre_contacto && phone) {
        return `${conv.nombre_contacto} - ${phone}`;
    }
    return conv.nombre_contacto || phone || conv.remote_jid.split('@')[0];
}

export default function ConversacionPanel({
    instancia,
    selectedConvId,
    onSelect,
}: ConversacionPanelProps) {
    const { data, isLoading } = useConversaciones(instancia?.id ?? null);
    const conversaciones = data?.items || [];
    const [searchTerm, setSearchTerm] = useState('');

    // Resetear búsqueda al cambiar de comercial
    useEffect(() => {
        setSearchTerm('');
    }, [instancia?.id]);

    // Filtrar conversaciones por teléfono o nombre de contacto
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return conversaciones;
        const q = searchTerm.toLowerCase().replace(/[+\s-]/g, '');
        return conversaciones.filter((conv) => {
            const phone = conv.remote_jid.split('@')[0];
            const name = (conv.nombre_contacto || '').toLowerCase();
            return phone.includes(q) || name.includes(q);
        });
    }, [conversaciones, searchTerm]);

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

                {/* Buscador por teléfono/nombre */}
                <div className="relative mt-2.5">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por número o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-naranja-500/20 focus:border-naranja-500/50 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
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
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Search size={22} className="mb-2 opacity-40" />
                        <p className="text-xs">No se encontraron resultados</p>
                        <p className="text-[10px] mt-0.5 opacity-60">para "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map((conv) => {
                            const isSelected = selectedConvId === conv.id;
                            const displayName = getDisplayName(conv);

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
