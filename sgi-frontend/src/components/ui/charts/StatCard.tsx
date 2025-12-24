// ==========================================
// src/components/ui/charts/StatCard.tsx
// Tarjeta KPI reutilizable
// ==========================================

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs mes anterior",
  icon,
  color = 'blue',
  className = ''
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const isPositive = change !== undefined && change > 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 flex items-center gap-1 ${changeColor}`}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(change)}% {changeLabel}</span>
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// EJEMPLO DE USO:
// ==========================================
// import { StatCard } from '@/components/ui/charts/StatCard';
//
// <StatCard 
//   title="Cotizaciones del Mes" 
//   value={45} 
//   change={12}
//   color="blue"
//   icon={<svg>...</svg>}
// />