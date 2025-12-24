"use client"; // Marcamos este archivo como cliente

import ComercialDashboardContent from '@/components/comercialDashboard/ComercialDashboardContent';

export default function DashboardCharts() {
  const datosVentas = [
    { mes: 'Ene', ventas: 4000, meta: 3500 },
    { mes: 'Feb', ventas: 3000, meta: 3500 },
    { mes: 'Mar', ventas: 5000, meta: 4000 },
    { mes: 'Abr', ventas: 4500, meta: 4000 },
    { mes: 'May', ventas: 6000, meta: 5000 },
  ];
  return (
    <main className='space-y-8'>
      <h1 className='font-extrabold text-azul-500 uppercase text-center pt-6 text-3xl'>Bienvenido, Comercial</h1>
      <ComercialDashboardContent data={datosVentas} />
    </main>
  );
}