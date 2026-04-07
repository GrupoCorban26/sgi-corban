import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DepartamentoDistribucion } from '@/types/organizacion/dashboard';

const DEPT_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  'bg-indigo-500', 'bg-teal-500'
];

interface DepartmentDistributionProps {
  departamentos: DepartamentoDistribucion[];
  empleadosActivos: number;
  loading: boolean;
}

export default function DepartmentDistribution({ departamentos, empleadosActivos, loading }: DepartmentDistributionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Building2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Colaboradores por Departamento</h3>
            <p className="text-xs text-gray-400">Distribución del equipo</p>
          </div>
        </div>
        <Link
          href="/administracion/organizacion"
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          Gestionar <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="w-28 h-3.5 bg-gray-100 rounded" />
                <div className="w-full h-2 bg-gray-50 rounded-full" />
              </div>
            ))}
          </div>
        ) : departamentos && departamentos.length > 0 ? (
          <div className="space-y-4">
            {departamentos.map((dept, idx) => {
              const color = DEPT_COLORS[idx % DEPT_COLORS.length];
              return (
                <div key={dept.nombre} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{dept.nombre}</span>
                    <span className="text-sm font-semibold text-gray-900">{dept.total}</span>
                  </div>
                  <ProgressBar
                    value={dept.total}
                    max={empleadosActivos}
                    color={color}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <Building2 className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sin datos de departamentos</p>
          </div>
        )}
      </div>
    </div>
  );
}
