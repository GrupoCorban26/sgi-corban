'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { PhoneCall, PhoneMissed } from 'lucide-react';

interface ChartCasosLlamadaProps {
    data: { motivo: string; cantidad: number }[];
    title: string;
    type: 'contestada' | 'no_contestada';
}

const COLORS_CONTESTADA = ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
const COLORS_NO_CONTESTADA = ['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6', '#6366F1', '#F97316'];

export function ChartCasosLlamada({ data, title, type }: ChartCasosLlamadaProps) {
    const total = data.reduce((sum, item) => sum + item.cantidad, 0);
    const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);
    const COLORS = type === 'contestada' ? COLORS_CONTESTADA : COLORS_NO_CONTESTADA;
    const Icon = type === 'contestada' ? PhoneCall : PhoneMissed;
    const iconColor = type === 'contestada' ? 'text-emerald-500' : 'text-red-500';

    if (total === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                    <Icon className={iconColor} size={20} />
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                </div>
                <div className="p-5 flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[260px]">
                    <span className="text-4xl font-bold text-gray-800 mb-2">0</span>
                    <span className="text-xs font-medium uppercase tracking-wider mb-4">CASOS</span>
                    <span className="text-sm">No hay casos registrados</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Icon className={iconColor} size={20} />
                <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            <div className="p-5 flex flex-col md:flex-row items-center gap-8 flex-1" style={{ minHeight: 260 }}>
                {/* Gráfico */}
                <div className="w-full md:w-5/12 h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sortedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="cantidad"
                                stroke="none"
                            >
                                {sortedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #F3F4F6',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '8px 12px'
                                }}
                                itemStyle={{ color: '#4B5563', fontWeight: 600 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* KPI Central */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-extrabold text-gray-800">{total}</span>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Casos</span>
                    </div>
                </div>

                {/* Leyenda Detallada (Tarjetas) */}
                <div className="w-full md:w-7/12 flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                    {sortedData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span 
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" 
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                ></span>
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors whitespace-nowrap">
                                    {item.motivo}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                <span className="text-sm font-bold text-gray-900">{item.cantidad}</span>
                                <span className="text-xs font-medium text-gray-400 w-8 text-right">
                                    {Math.round((item.cantidad / total) * 100)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
