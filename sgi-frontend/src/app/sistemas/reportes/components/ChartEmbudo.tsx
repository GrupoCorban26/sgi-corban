'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { Filter } from 'lucide-react';

interface ChartEmbudoProps {
    convertidos: number;
    descartados: number;
    enGestion: number;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];
const LABELS = ['Convertidos', 'En Gestión', 'Descartados'];

export function ChartEmbudo({ convertidos, descartados, enGestion }: ChartEmbudoProps) {
    const total = convertidos + descartados + enGestion;
    const data = [
        { name: 'Convertidos', value: convertidos },
        { name: 'En Gestión', value: enGestion },
        { name: 'Descartados', value: descartados },
    ].filter((d) => d.value > 0);

    const pctConversion = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Filter className="text-emerald-500" size={20} />
                <h3 className="font-semibold text-gray-800">Embudo de Conversión</h3>
            </div>
            <div className="p-5 flex flex-col md:flex-row items-center gap-8 flex-1" style={{ minHeight: 260 }}>
                {/* Gráfico */}
                <div className="w-full md:w-5/12 h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[LABELS.indexOf(entry.name)] || '#E5E7EB'}
                                    />
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
                        <span className="text-3xl font-extrabold text-gray-800">{pctConversion}%</span>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Conversión</span>
                    </div>
                </div>

                {/* Leyenda Detallada (Tarjetas) */}
                <div className="w-full md:w-7/12 flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                    {[
                        { label: 'Convertidos', value: convertidos, color: COLORS[0], pct: total > 0 ? Math.round((convertidos / total) * 100) : 0 },
                        { label: 'En Gestión', value: enGestion, color: COLORS[1], pct: total > 0 ? Math.round((enGestion / total) * 100) : 0 },
                        { label: 'Descartados', value: descartados, color: COLORS[2], pct: total > 0 ? Math.round((descartados / total) * 100) : 0 },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span 
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" 
                                    style={{ backgroundColor: item.color }}
                                ></span>
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors whitespace-nowrap">
                                    {item.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                <span className="text-sm font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                                    {item.value.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-gray-400 w-9 text-right">
                                    {item.pct}%
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-gray-100 border border-gray-200">
                        <span className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Total Embudo
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">{total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
