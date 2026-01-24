"use client"; // Paso 1: Marcamos como componente de cliente


import { StatCard } from '@/components/ui/charts'; // StatCard no necesita dynamic (no usa Recharts)
import { TrendingUp, DollarSign, Package } from 'lucide-react';

import RecordatorioLlamadas from '@/components/comercial/RecordatorioLlamadas';

interface Props {
  data: any[]; // Datos que vienen del page.tsx (Server Component)
}

export default function ComercialDashboardContent({ data }: Props) {
  return (
    <div className="flex flex-col gap-6">

      {/* Sección de KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Meta de cierres"
          value="5/10"
          icon={<DollarSign size={20} />}
          change={4}
        />
        <StatCard
          title="Órdenes"
          value="32"
          icon={<Package size={20} />}
          change={-5}
        />
        <StatCard
          title="Cotizaciones"
          value="46"
          icon={<TrendingUp size={20} />}
          change={-1}
        />
      </div>

      {/* SECCIÓN DE RECORDATORIO DE LLAMADAS */}
      <div className="grid grid-cols-1 gap-6">
        <RecordatorioLlamadas />
      </div>

    </div>
  );
}