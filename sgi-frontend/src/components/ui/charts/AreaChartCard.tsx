"use client";

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from '@/lib/utils';

interface AreaSeries {
  key: string;
  label: string;
  color: string;
}

interface AreaChartCardProps {
  title?: string;
  data: any[];
  xKey: string;
  series: AreaSeries[];
  className?: string;
  stacked?: boolean; // Para apilar las áreas una sobre otra
}

export default function AreaChartCard({ 
  title, 
  data, 
  xKey, 
  series, 
  className,
  stacked = false 
}: AreaChartCardProps) {
  return (
    <div className={cn(
      "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-100 w-full flex flex-col",
      className
    )}>
      {title && (
        <h3 className="text-lg font-bold text-azul-900 mb-6">{title}</h3>
      )}

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Definición dinámica de degradados para cada serie */}
              {series.map((s) => (
                <linearGradient key={`grad-${s.key}`} id={`color${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey={xKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
            />

            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />

            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
              }}
            />

            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />

            {series.map((s) => (
              <Area
                key={s.key}
                name={s.label}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#color${s.key})`} // Conecta con el degradado de arriba
                stackId={stacked ? "1" : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}