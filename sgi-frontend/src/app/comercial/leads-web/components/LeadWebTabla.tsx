'use client';

import React from 'react';
import { LeadWeb } from '@/types/lead-web';
import {
    Globe, Mail, Phone, User, Clock, ChevronRight
} from 'lucide-react';

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    NUEVO: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', label: 'Nuevo' },
    PENDIENTE: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', label: 'Pendiente' },
    EN_GESTION: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', label: 'En Gestión' },
    CONVERTIDO: { bg: 'bg-green-50 border-green-100', text: 'text-green-700', label: 'Convertido' },
    DESCARTADO: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', label: 'Descartado' },
};

const PAGINA_COLOR: Record<string, string> = {
    'grupocorban.pe': 'from-blue-500 to-blue-600',
    'corbantranslogistic.com': 'from-teal-500 to-emerald-600',
    'corbanaduanas.pe': 'from-indigo-500 to-violet-600',
    'eblgroup.pe': 'from-red-500 to-rose-600',
};

const PAGINA_LABEL: Record<string, string> = {
    'grupocorban.pe': 'Grupo Corban',
    'corbantranslogistic.com': 'Corban Trans',
    'corbanaduanas.pe': 'Corban Aduanas',
    'eblgroup.pe': 'EBL Group',
};

interface Props {
    leads: LeadWeb[];
    selectedId?: number;
    onSelect: (lead: LeadWeb) => void;
}

export default function LeadWebTabla({ leads, selectedId, onSelect }: Props) {
    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="divide-y divide-slate-100">
            {leads.map((lead) => {
                const estadoBadge = ESTADO_BADGE[lead.estado] || ESTADO_BADGE.NUEVO;
                const paginaColor = PAGINA_COLOR[lead.pagina_origen] || 'from-slate-400 to-slate-500';
                const paginaLabel = PAGINA_LABEL[lead.pagina_origen] || lead.pagina_origen;
                const isSelected = selectedId === lead.id;

                return (
                    <div
                        key={lead.id}
                        onClick={() => onSelect(lead)}
                        className={`
                            px-6 py-4 cursor-pointer transition-all duration-150 hover:bg-white
                            ${isSelected
                                ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500'
                                : 'bg-white/50 border-l-4 border-l-transparent hover:border-l-slate-200'
                            }
                        `}
                    >
                        <div className="flex items-start gap-4">
                            {/* Avatar con inicial */}
                            <div className={`
                                w-11 h-11 bg-gradient-to-br ${paginaColor}
                                rounded-xl flex items-center justify-center text-white font-bold text-lg
                                shadow-sm flex-shrink-0
                            `}>
                                {lead.nombre.charAt(0).toUpperCase()}
                            </div>

                            {/* Contenido principal */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-800 text-sm truncate">
                                        {lead.nombre}
                                    </h3>
                                    <span className={`
                                        px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0
                                        ${estadoBadge.bg} ${estadoBadge.text}
                                    `}>
                                        {estadoBadge.label}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 font-medium truncate mb-1.5">
                                    {lead.asunto}
                                </p>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Globe size={11} />
                                        {paginaLabel}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Mail size={11} />
                                        {lead.correo}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={11} />
                                        {formatFecha(lead.fecha_recepcion)}
                                    </span>
                                    {lead.nombre_asignado && (
                                        <span className="flex items-center gap-1">
                                            <User size={11} />
                                            {lead.nombre_asignado}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Flecha */}
                            <ChevronRight
                                size={16}
                                className={`text-slate-300 flex-shrink-0 mt-3 transition-colors ${isSelected ? 'text-indigo-400' : ''}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
