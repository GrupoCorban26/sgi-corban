"use client"; // Paso 1: Marcamos como componente de cliente

import dynamic from 'next/dynamic';
import { StatCard } from '@/components/ui/charts'; // StatCard no necesita dynamic (no usa Recharts)
import { TrendingUp, DollarSign, Package } from 'lucide-react';

const PieChartCard = dynamic(
  () => import('@/components/ui/charts').then((mod) => mod.PieChartCard),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-slate-100 rounded-3xl" />}
);

const BarChartCard = dynamic(
  () => import('@/components/ui/charts').then((mod) => mod.BarChartCard),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-slate-100 rounded-3xl" />}
);


// Paso 2: Importamos el gráfico de líneas de forma dinámica (SSR: False)
const LineChartCard = dynamic(
  () => import('@/components/ui/charts').then((mod) => mod.LineChartCard),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-slate-100 rounded-3xl" /> }
);

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

      {/* SECCIÓN DEL GRÁFICO DE LÍNEAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 place-content-center gap-6">
        <LineChartCard 
          title="Evolución Mensual de Ventas"
          data={data} // Pasamos los datos que recibimos del padre
          xKey="mes"  // Le decimos que use la columna 'mes' para el suelo del gráfico
          series={[
            { key: "ventas", label: "Ventas Reales", color: "#1e3a8a" }, // Azul Corban
            { key: "meta", label: "Meta Comercial", color: "#f97316" }   // Naranja Corban
          ]}
        />
        <PieChartCard
          title='AreaChart'
          data={data}
          categoryKey="Hola"
          nameKey="Chau"
        />
        <BarChartCard
          title='Grafico de barras'
          data={data}
          xKey='X key'
          bars={data}
          layout='horizontal'
        />
      </div>

    </div>
  );
}