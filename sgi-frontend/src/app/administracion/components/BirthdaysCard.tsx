import Link from 'next/link';
import { Gift, ChevronRight, Cake } from 'lucide-react';
import { CumpleanosProximo } from '@/types/organizacion/dashboard';

const MONTH_NAMES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

interface BirthdaysCardProps {
  cumpleanos: CumpleanosProximo[];
  loading: boolean;
}

export default function BirthdaysCard({ cumpleanos, loading }: BirthdaysCardProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-50 rounded-xl">
            <Gift className="h-5 w-5 text-pink-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Próximos Cumpleaños</h3>
            <p className="text-xs text-gray-400">En los próximos 30 días</p>
          </div>
        </div>
        <Link
          href="/administracion/cumpleanos"
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          Ver todos <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3.5 bg-gray-100 rounded" />
                  <div className="w-20 h-3 bg-gray-50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cumpleanos && cumpleanos.length > 0 ? (
          <ul className="space-y-1">
            {cumpleanos.map((emp) => (
              <li
                key={emp.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${emp.dias_restantes === 0
                    ? 'bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100'
                    : 'hover:bg-gray-50'
                  }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center ${emp.dias_restantes === 0
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                    : 'bg-indigo-50 text-indigo-600'
                  }`}>
                  <span className="text-[10px] font-medium leading-none">{MONTH_NAMES[emp.mes]}</span>
                  <span className="text-sm font-bold leading-tight">{emp.dia}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${emp.dias_restantes === 0 ? 'text-pink-700' : 'text-gray-800'
                    }`}>
                    {emp.nombres} {emp.apellido_paterno}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{emp.cargo_nombre}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${emp.dias_restantes === 0
                    ? 'bg-pink-100 text-pink-700'
                    : emp.dias_restantes <= 3
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                  {emp.dias_restantes === 0 ? '🎉 ¡Hoy!' : `${emp.dias_restantes}d`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Cake className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">No hay cumpleaños próximos</p>
          </div>
        )}
      </div>
    </div>
  );
}
