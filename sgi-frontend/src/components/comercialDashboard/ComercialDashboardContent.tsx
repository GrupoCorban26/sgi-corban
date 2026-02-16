import { useState } from 'react';
import { StatCard } from '@/components/ui/charts';
import { TrendingUp, DollarSign, Package, CalendarPlus } from 'lucide-react';

import RecordatorioLlamadas from '@/components/comercial/RecordatorioLlamadas';
import UpcomingAppointments from '@/components/comercial/UpcomingAppointments';
import ModalCita from '@/components/comercial/ModalCita';

interface Props {
  data: any[];
}

export default function ComercialDashboardContent({ data }: Props) {
  const [isCitaOpen, setIsCitaOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">

      {/* Header + Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsCitaOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 font-medium"
        >
          <CalendarPlus size={18} />
          Agendar Cita
        </button>
      </div>

      <ModalCita isOpen={isCitaOpen} onClose={() => setIsCitaOpen(false)} />

      {/* SECCIÓN DE AGENDA Y RECORDATORIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        <RecordatorioLlamadas />
        <UpcomingAppointments />
      </div>

    </div>
  );
}