import { ContactoAsignado } from '@/types/base-comercial';

interface BaseStatsBarProps {
  contactos: ContactoAsignado[];
}

export default function BaseStatsBar({ contactos }: BaseStatsBarProps) {
  const guardados = contactos.filter((c) => c.fecha_llamada !== null).length;
  const pendientes = contactos.filter((c) => c.fecha_llamada === null).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-lg">
        <div className="text-sm opacity-80">Total Asignados</div>
        <div className="text-2xl font-bold">{contactos.length}</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg">
        <div className="text-sm opacity-80">Guardados</div>
        <div className="text-2xl font-bold">{guardados}</div>
      </div>
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-lg">
        <div className="text-sm opacity-80">Pendientes</div>
        <div className="text-2xl font-bold">{pendientes}</div>
      </div>
    </div>
  );
}
