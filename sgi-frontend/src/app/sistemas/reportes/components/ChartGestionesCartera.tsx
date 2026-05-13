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
    LabelList,
    Legend,
} from 'recharts';
import { Briefcase } from 'lucide-react';
import { DashboardComercial } from '@/types/dashboard';

interface ChartGestionesCarteraProps {
    data: DashboardComercial[];
}

export function ChartGestionesCartera({ data }: ChartGestionesCarteraProps) {
    // Tomar top 10 para legibilidad ordenados por gestiones_cartera
    const topData = [...data]
        .sort((a, b) => b.gestiones_cartera - a.gestiones_cartera)
        .slice(0, 10)
        .map((item) => ({
            ...item,
            nombre: item.nombre.split(' ').slice(0, 2).join(' '), // Nombre corto
        }));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Briefcase className="text-violet-500" size={20} />
                <h3 className="font-semibold text-gray-800">Gestión de Cartera por Comercial</h3>
                <span className="text-xs text-gray-400 ml-auto">Top {topData.length}</span>
            </div>
            <div className="p-4" style={{ height: Math.max(300, topData.length * 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={topData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <XAxis
                            type="number"
                            hide
                        />
                        <YAxis
                            dataKey="nombre"
                            type="category"
                            width={110}
                            tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Legend
                            verticalAlign="top"
                            height={40}
                            iconType="circle"
                            iconSize={10}
                            wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}
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
                        <Bar
                            dataKey="gestiones_llamada"
                            name="Llamada"
                            stackId="cartera"
                            fill="#3B82F6"
                            barSize={20}
                        />
                        <Bar
                            dataKey="gestiones_whatsapp"
                            name="WhatsApp"
                            stackId="cartera"
                            fill="#22C55E"
                        />
                        <Bar
                            dataKey="gestiones_correo"
                            name="Correo"
                            stackId="cartera"
                            fill="#F59E0B"
                        />
                        <Bar
                            dataKey="gestiones_otro"
                            name="Otro"
                            stackId="cartera"
                            fill="#8B5CF6"
                            radius={[0, 6, 6, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
