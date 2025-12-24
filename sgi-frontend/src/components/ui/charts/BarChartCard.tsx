"use client";

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
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarConfig {
  key: string;    // Campo en los datos (ej: "ingresos")
  label: string;  // Nombre amigable (ej: "Ingresos Brutos")
  color: string;  // Color base de la barra
}

interface BarChartCardProps {
  title?: string;
  data: any[];
  xKey: string;
  bars: BarConfig[];
  className?: string;
  layout?: 'horizontal' | 'vertical'; // Para barras paradas o echadas
}

export default function BarChartCard({ 
  title, 
  data, 
  xKey, 
  bars, 
  className,
  layout = 'horizontal' 
}: BarChartCardProps) {
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
          <BarChart 
            data={data} 
            layout={layout}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} stroke="#f1f5f9" />
            
            <XAxis 
              type={layout === 'horizontal' ? 'category' : 'number'}
              dataKey={layout === 'horizontal' ? xKey : undefined}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              hide={layout === 'vertical'}
            />

            <YAxis 
              type={layout === 'horizontal' ? 'number' : 'category'}
              dataKey={layout === 'horizontal' ? undefined : xKey}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />

            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
              }}
            />

            <Legend verticalAlign="top" align="right" height={36} iconType="rect" />

            {bars.map((b) => (
              <Bar
                key={b.key}
                name={b.label}
                dataKey={b.key}
                fill={b.color}
                radius={layout === 'horizontal' ? [6, 6, 0, 0] : [0, 6, 6, 0]} // Puntas redondeadas
                barSize={layout === 'horizontal' ? 30 : 20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}