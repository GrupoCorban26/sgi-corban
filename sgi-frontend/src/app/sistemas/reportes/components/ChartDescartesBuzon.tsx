'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArchiveX } from 'lucide-react';

interface ChartDescartesBuzonProps {
    data: { motivo: string; cantidad: number }[];
}

const COLORS = ['#F87171', '#FB923C', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF'];

export function ChartDescartesBuzon({ data }: ChartDescartesBuzonProps) {
    const total = data.reduce((sum, item) => sum + item.cantidad, 0);

    const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <ArchiveX className="text-red-500" size={20} />
                <h3 className="font-semibold text-gray-800">Motivos de Descarte Buzón</h3>
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
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Descartes</span>
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
                                <span className="text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900 transition-colors" title={item.motivo}>
                                    {item.motivo}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                <span className="text-sm font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                                    {item.cantidad.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-gray-400 w-9 text-right">
                                    {total > 0 ? Math.round((item.cantidad / total) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    ))}
                    {sortedData.length === 0 && (
                        <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium italic">
                            No hay descartes registrados
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
