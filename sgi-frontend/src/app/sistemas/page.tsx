"use client";

import React, { useEffect, useState } from 'react';
import { useContactos } from '@/hooks/comercial/useContactos';
import { KpisGestion } from '@/types/contactos';
import { Users, PhoneCall, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardSistemas() {
  const { getKpisGestion } = useContactos();
  const [kpis, setKpis] = useState<KpisGestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    const loadKpis = async () => {
      try {
        const data = await getKpisGestion();
        setKpis(data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar métricas');
      } finally {
        setLoading(false);
      }
    };
    loadKpis();
  }, [getKpisGestion]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-azul-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <main className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="font-extrabold text-azul-500 uppercase text-3xl">
          Bienvenido, Sistemas
        </h1>

        {/* Filtro de Fechas */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm text-gray-600"
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm text-gray-600"
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
          {/* El useEffect se encarga de recargar cuando cambia dateRange si así se desea, 
                o podríamos agregar un botón para aplicar */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Contactos Repartidos */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center hover:shadow-lg transition-shadow">
          <div className="p-3 bg-blue-100 rounded-full mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-gray-500 font-medium">Contactos Repartidos</h2>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {kpis?.total_repartido || 0}
          </p>
          <span className="text-xs text-gray-400 mt-1">Asignados + Gestionados</span>
        </div>

        {/* KPI 2: Tasa de Contactabilidad */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center hover:shadow-lg transition-shadow">
          <div className="p-3 bg-purple-100 rounded-full mb-4">
            <PhoneCall className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-gray-500 font-medium">Tasa de Contactabilidad</h2>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {kpis?.tasa_contactabilidad || 0}%
          </p>
          <span className="text-xs text-gray-400 mt-1">Contestados / Gestionados</span>
        </div>

        {/* KPI 3: Tasa de No Rechazo (Positivos) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center hover:shadow-lg transition-shadow">
          <div className="p-3 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-gray-500 font-medium">Tasa de No Rechazo</h2>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {kpis?.tasa_positivos || 0}%
          </p>
          <span className="text-xs text-gray-400 mt-1">Positivos / Contestados</span>
        </div>
      </div>

      {/* Gráfico de Torta: Distribución de Casos */}
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Distribución de Casos</h2>
        <div className="h-96 w-full">
          {kpis?.casos_distribucion && kpis.casos_distribucion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.casos_distribucion}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {kpis.casos_distribucion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400">
              No hay datos de casos disponibles
            </div>
          )}
        </div>
      </div>
    </main>
  );
}