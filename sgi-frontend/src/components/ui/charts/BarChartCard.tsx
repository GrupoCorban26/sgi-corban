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
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarConfig {
  key: string;    // Campo en los datos (ej: "ingresos")
  label: string;  // Nombre amigable (ej: "Ingresos Brutos")
  color: string;  // Color base de la barra
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataRecord = Record<string, any>;

interface BarChartCardProps {
  title?: string;
  data: ChartDataRecord[];
  xKey: string;
  bars: BarConfig[];
  className?: string;
  layout?: 'horizontal' | 'vertical'; // Para barras paradas o echadas
  xAxisDomain?: [any, any];
  yAxisDomain?: [any, any];
  height?: number | string; // Prop de altura dinámica para evitar cortes en gráficos verticales largos
}

export default function BarChartCard({ 
  title, 
  data, 
  xKey, 
  bars, 
  className,
  layout = 'horizontal',
  xAxisDomain,
  yAxisDomain,
  height
}: BarChartCardProps) {
  return (
    <div className={cn(
      "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full",
      className
    )}>
      {title && (
        <h3 className="text-lg font-bold text-azul-900 mb-6">{title}</h3>
      )}

      {/* Usamos el prop de height si se proporciona, sino por defecto 280px */}
      <div className="w-full" style={{ height: height || 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout={layout}
            margin={layout === 'vertical' 
              ? { top: 5, right: 20, left: 10, bottom: 5 }
              : { top: 5, right: 10, left: -20, bottom: 0 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} stroke="#f1f5f9" />
            
            <XAxis 
              type={layout === 'horizontal' ? 'category' : 'number'}
              dataKey={layout === 'horizontal' ? xKey : undefined}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              domain={xAxisDomain}
            />

            <YAxis 
              type={layout === 'horizontal' ? 'number' : 'category'}
              dataKey={layout === 'horizontal' ? undefined : xKey}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={layout === 'vertical' ? 120 : undefined} // Un poco más ancho para nombres largos de empresas
              domain={yAxisDomain}
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
                barSize={layout === 'horizontal' ? 30 : 15}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}