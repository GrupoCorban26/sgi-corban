'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Users } from 'lucide-react';
import { DashboardComercial } from '@/types/dashboard';

interface ChartComercialesProps {
    data: DashboardComercial[];
}

export function ChartComerciales({ data }: ChartComercialesProps) {
    // Tomar top 10 para legibilidad
    const topData = data.slice(0, 10).map((item) => ({
        ...item,
        solo_contestadas: Math.max(0, item.contestadas - item.efectivas),
        no_contestadas: Math.max(0, item.total_llamadas - item.contestadas),
        nombre: item.nombre.split(' ').slice(0, 2).join(' '), // Nombre corto
    }));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Users className="text-indigo-500" size={20} />
                <h3 className="font-semibold text-gray-800">Rendimiento por Comercial</h3>
                <span className="text-xs text-gray-400 ml-auto">Top {topData.length}</span>
            </div>
            <div className="p-4" style={{ height: Math.max(300, topData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={topData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            dataKey="nombre"
                            type="category"
                            width={120}
                            tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                            contentStyle={{
                                background: 'white',
                                border: '1px solid #F3F4F6',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '13px',
                                padding: '10px 14px'
                            }}
                            itemStyle={{ fontWeight: 500 }}
                            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                        />
                        <Legend
                            verticalAlign="top"
                            height={40}
                            iconType="circle"
                            iconSize={10}
                            wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}
                        />
                        <Bar
                            dataKey="efectivas"
                            name="Efectivas"
                            stackId="a"
                            fill="#3B82F6"
                            radius={[0, 0, 0, 0]}
                            barSize={20}
                        />
                        <Bar
                            dataKey="solo_contestadas"
                            name="Contestadas"
                            stackId="a"
                            fill="#10B981"
                        />
                        <Bar
                            dataKey="no_contestadas"
                            name="No Contestadas"
                            stackId="a"
                            fill="#EF4444"
                            radius={[0, 6, 6, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
