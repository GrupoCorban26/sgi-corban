"use client";

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from '@/lib/utils';

// Definimos la estructura de cada línea que queramos dibujar
interface LineSeries {
  key: string;    // Nombre del campo en los datos (ej: "monto")
  label: string;  // Nombre que verá el usuario (ej: "Ventas Totales")
  color: string;  // Color de la línea (ej: "#1e3a8a")
}

interface LineChartCardProps {
  title?: string;
  data: any[];           // El array de objetos con los datos
  xKey: string;          // La llave para el eje X (ej: "mes" o "fecha")
  series: LineSeries[];  // Lista de líneas a graficar
  className?: string;
}

export default function LineChartCard({ 
  title, 
  data, 
  xKey, 
  series, 
  className 
}: LineChartCardProps) {
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
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            {/* Cuadrícula sutil solo horizontal */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            {/* Eje X - Etiquetas de tiempo/categoría */}
            <XAxis 
              dataKey={xKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
            />

            {/* Eje Y - Valores numéricos */}
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
            />

            {/* Tooltip personalizado (lo que sale al pasar el mouse) */}
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
              }}
            />

            {/* Leyenda interactiva */}
            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />

            {/* Generación dinámica de líneas */}
            {series.map((s) => (
              <Line
                key={s.key}
                name={s.label}
                type="monotone" // Línea curva suave
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={3}
                dot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}