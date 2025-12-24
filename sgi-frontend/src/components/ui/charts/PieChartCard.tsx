"use client";

import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from '@/lib/utils';

interface PieChartCardProps {
  title?: string;
  data: any[];           // [{ name: 'Aéreo', value: 400 }, ...]
  categoryKey?: string;  // Por defecto 'value'
  nameKey?: string;      // Por defecto 'name'
  colors?: string[];     // Array de colores hexadecimales
  className?: string;
  isDonut?: boolean;     // Para elegir entre Torta o Dona
}

// Colores por defecto elegantes para Grupo Corban si no se pasan por props
const DEFAULT_COLORS = ['#1e3a8a', '#f97316', '#3b82f6', '#64748b', '#94a3b8'];

export default function PieChartCard({ 
  title, 
  data, 
  categoryKey = "value", 
  nameKey = "name", 
  colors = DEFAULT_COLORS,
  className,
  isDonut = true 
}: PieChartCardProps) {
  return (
    <div className={cn(
      "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-100 w-full flex flex-col",
      className
    )}>
      {title && (
        <h3 className="text-lg font-bold text-azul-900 mb-2">{title}</h3>
      )}

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 60 : 0} // Si es Dona, dejamos el centro vacío
              outerRadius={80}
              paddingAngle={5}
              dataKey={categoryKey}
              nameKey={nameKey}
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                  className="hover:opacity-80 transition-opacity outline-none"
                />
              ))}
            </Pie>
            
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
              }}
            />
            
            <Legend 
              verticalAlign="bottom" 
              align="center" 
              iconType="circle"
              layout="horizontal"
              formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}