"use client"; // Marcamos este archivo como cliente

import ComercialDashboardContent from '@/components/comercialDashboard/ComercialDashboardContent';

export default function DashboardCharts() {
  return (
    <main className='space-y-8'>
      <h1 className='font-extrabold text-azul-500 uppercase text-center pt-6 text-3xl'>Bienvenido, Comercial</h1>
      <div className="max-w-7xl mx-auto">
        <ComercialDashboardContent data={[]} />
      </div>
    </main>
  );
}