import Link from 'next/link';
import {
  Users, Phone, Cake, TrendingUp, Package, Calendar,
  ArrowRight
} from 'lucide-react';
import React from 'react';

interface QuickAction {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  border: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: '/administracion/organizacion',
    icon: Users,
    label: 'Organización',
    description: 'Departamentos, áreas y colaboradores',
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    border: 'hover:border-blue-200',
  },
  {
    href: '/administracion/inventario',
    icon: Package,
    label: 'Inventario',
    description: 'Gestión de activos y equipos',
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    border: 'hover:border-violet-200',
  },
  {
    href: '/administracion/lineas',
    icon: Phone,
    label: 'Líneas',
    description: 'Líneas corporativas y asignaciones',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    border: 'hover:border-emerald-200',
  },
  {
    href: '/administracion/cumpleanos',
    icon: Cake,
    label: 'Cumpleaños',
    description: 'Calendario de cumpleaños del equipo',
    color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
    border: 'hover:border-pink-200',
  },
  {
    href: '/administracion/asistencias',
    icon: Calendar,
    label: 'Asistencias',
    description: 'Control de asistencia y horarios',
    color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    border: 'hover:border-amber-200',
  },
  {
    href: '/administracion/rendimiento',
    icon: TrendingUp,
    label: 'Rendimiento',
    description: 'Métricas y evaluaciones',
    color: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
    border: 'hover:border-cyan-200',
  },
];

export default function QuickActions() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Módulos</h2>
          <p className="text-sm text-gray-400">Accede rápidamente a cada sección del sistema</p>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className={`group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${action.border}`}>
              <div className={`flex-shrink-0 p-3 rounded-xl transition-colors duration-300 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">{action.label}</p>
                <p className="text-xs text-gray-400 truncate">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-all duration-300 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
