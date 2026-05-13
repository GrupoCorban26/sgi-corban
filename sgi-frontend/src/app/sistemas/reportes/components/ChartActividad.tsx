'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Activity } from 'lucide-react';
import { DashboardActividadDia } from '@/types/dashboard';

interface ChartActividadProps {
    data: DashboardActividadDia[];
}

export function ChartActividad({ data }: ChartActividadProps) {
    // Formatear fecha para eje X (dd/MM)
    const formattedData = data.map((item) => ({
        ...item,
        fechaCorta: item.fecha.slice(8, 10) + '/' + item.fecha.slice(5, 7),
    }));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                <h3 className="font-semibold text-gray-800">Actividad Diaria</h3>
                <div className="flex items-center gap-4 ml-auto text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                        Llam. Base
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-violet-400"></span>
                        Llam. Cartera
                    </span>
                </div>
            </div>
            <div className="p-4" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCartera" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                        <XAxis
                            dataKey="fechaCorta"
                            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                            tickLine={false}
                            axisLine={{ stroke: '#F3F4F6' }}
                            interval={Math.max(0, Math.floor(formattedData.length / 10))}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'white',
                                border: '1px solid #F3F4F6',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '13px',
                                padding: '10px 14px'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                            itemStyle={{ fontWeight: 500 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="llamadas_base"
                            name="Llamadas Base"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBase)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="llamadas_cartera"
                            name="Llamadas Cartera"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCartera)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#8B5CF6', stroke: 'white', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
