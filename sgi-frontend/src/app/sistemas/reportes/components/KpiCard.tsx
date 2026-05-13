'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
    titulo: string;
    valor: string | number;
    sufijo?: string;
    tendencia?: number | null;
    icon: LucideIcon;
    colorScheme: 'blue' | 'emerald' | 'violet' | 'amber' | 'teal' | 'rose' | 'indigo';
    invertirTendencia?: boolean; // Para métricas donde bajar es bueno (ej: tiempo respuesta)
}

const COLOR_MAP = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-100 text-blue-600',
        accent: 'text-blue-600',
    },
    emerald: {
        bg: 'bg-emerald-50',
        icon: 'bg-emerald-100 text-emerald-600',
        accent: 'text-emerald-600',
    },
    violet: {
        bg: 'bg-violet-50',
        icon: 'bg-violet-100 text-violet-600',
        accent: 'text-violet-600',
    },
    amber: {
        bg: 'bg-amber-50',
        icon: 'bg-amber-100 text-amber-600',
        accent: 'text-amber-600',
    },
    teal: {
        bg: 'bg-teal-50',
        icon: 'bg-teal-100 text-teal-600',
        accent: 'text-teal-600',
    },
    rose: {
        bg: 'bg-rose-50',
        icon: 'bg-rose-100 text-rose-600',
        accent: 'text-rose-600',
    },
    indigo: {
        bg: 'bg-indigo-50',
        icon: 'bg-indigo-100 text-indigo-600',
        accent: 'text-indigo-600',
    },
};

export function KpiCard({
    titulo,
    valor,
    sufijo,
    tendencia,
    icon: Icon,
    colorScheme,
    invertirTendencia = false,
}: KpiCardProps) {
    const colors = COLOR_MAP[colorScheme];

    const getTendenciaColor = () => {
        if (tendencia === null || tendencia === undefined || tendencia === 0)
            return 'text-gray-400 bg-gray-50';
        const esBueno = invertirTendencia ? tendencia < 0 : tendencia > 0;
        return esBueno
            ? 'text-emerald-700 bg-emerald-50'
            : 'text-rose-700 bg-rose-50';
    };

    const getTendenciaIcon = () => {
        if (tendencia === null || tendencia === undefined || tendencia === 0) return Minus;
        return tendencia > 0 ? TrendingUp : TrendingDown;
    };

    const TendenciaIcon = getTendenciaIcon();

    return (
        <div className={`${colors.bg} p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-all duration-300 group`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${colors.icon} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={20} />
                </div>
                {tendencia !== null && tendencia !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${getTendenciaColor()}`}>
                        <TendenciaIcon size={12} />
                        {Math.abs(tendencia)}%
                    </div>
                )}
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                {titulo}
            </p>
            <div className="flex items-baseline gap-1">
                <h3 className={`text-2xl font-extrabold text-gray-900`}>
                    {valor}
                </h3>
                {sufijo && (
                    <span className="text-sm font-medium text-gray-400">{sufijo}</span>
                )}
            </div>
        </div>
    );
}
