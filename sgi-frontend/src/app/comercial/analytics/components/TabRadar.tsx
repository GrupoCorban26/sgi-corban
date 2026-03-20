'use client';

import React from 'react';
import { Target, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { RadarResponse } from '@/types/analytics-comercial';
import { BarChartCard, StatCard } from '@/components/ui/charts';

interface TabRadarProps {
  data: RadarResponse;
}

export default function TabRadar({ data }: TabRadarProps) {
  const { kpis, progreso_comerciales, pipeline_comerciales, alertas_clientes_muertos } = data;

  // Datos para el gráfico de barras de progreso
  const progresoChartData = progreso_comerciales.map((c) => ({
    nombre: c.iniciales || c.nombre.split(' ')[0],
    'Logístico': c.ordenes_logistico,
    'Aduanas': c.ordenes_aduanas,
    'Integral': c.ordenes_integral,
    Meta: c.meta,
  }));

  // Datos para el pipeline apilado
  const pipelineChartData = pipeline_comerciales.map((c) => ({
    nombre: c.nombre.split(' ')[0],
    Prospectos: c.prospectos,
    Negociación: c.negociacion,
    Cerrada: c.cerrada,
    Operación: c.operacion,
  }));

  // Total de órdenes del equipo
  const totalOrdenesEquipo = progreso_comerciales.reduce((acc, c) => acc + c.total_ordenes, 0);
  const porcentajeEquipo = kpis.meta_ordenes_equipo > 0
    ? Math.min(Math.round((totalOrdenesEquipo / kpis.meta_ordenes_equipo) * 100), 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Meta Ordenes Equipo"
          value={`${totalOrdenesEquipo} / ${kpis.meta_ordenes_equipo}`}
          icon={<Target size={24} />}
          color="blue"
        />
        <StatCard
          title="% Cumplimiento"
          value={`${porcentajeEquipo}%`}
          icon={<TrendingUp size={24} />}
          color={porcentajeEquipo >= 80 ? 'green' : porcentajeEquipo >= 50 ? 'orange' : 'red'}
        />
        <StatCard
          title="Gestiones del Mes"
          value={kpis.total_gestiones}
          icon={<Users size={24} />}
          color="purple"
        />
        <StatCard
          title="Clientes Nuevos"
          value={kpis.clientes_nuevos}
          icon={<TrendingUp size={24} />}
          color="green"
        />
      </div>

      {/* Progreso de Órdenes por Comercial */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Target size={20} className="text-blue-600" />
          Progreso de Órdenes vs Meta ({kpis.meta_individual}/mes)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de barras apiladas */}
          <BarChartCard
            title="Órdenes por Tipo de Servicio"
            data={progresoChartData}
            xKey="nombre"
            bars={[
              { key: 'Logístico', label: 'Logístico', color: '#3b82f6' },
              { key: 'Aduanas', label: 'Aduanas', color: '#f97316' },
              { key: 'Integral', label: 'Integral', color: '#8b5cf6' },
            ]}
          />

          {/* Tabla de progreso individual */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Progreso Individual</h3>
            <div className="space-y-3">
              {progreso_comerciales.map((c) => (
                <div key={c.comercial_id} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600 truncate">
                    {c.iniciales || c.nombre.split(' ')[0]}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.porcentaje >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                        c.porcentaje >= 70 ? 'bg-gradient-to-r from-blue-500 to-indigo-400' :
                        c.porcentaje >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                        'bg-gradient-to-r from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${Math.min(c.porcentaje, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                      {c.total_ordenes} / {c.meta}
                    </span>
                  </div>
                  <div className="w-14 text-right text-sm font-bold text-slate-700">
                    {c.porcentaje}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline por Comercial */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          Pipeline por Comercial
        </h3>
        <BarChartCard
          title="Distribución de Clientes por Etapa"
          data={pipelineChartData}
          xKey="nombre"
          bars={[
            { key: 'Prospectos', label: 'Prospectos', color: '#94a3b8' },
            { key: 'Negociación', label: 'Negociación', color: '#3b82f6' },
            { key: 'Cerrada', label: 'Cerrada', color: '#f97316' },
            { key: 'Operación', label: 'Operación', color: '#22c55e' },
          ]}
        />
      </section>

      {/* Alertas de Clientes Muertos */}
      {alertas_clientes_muertos.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Clientes sin Contacto (&gt; 15 días)
          </h3>
          <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50/50 border-b border-red-100">
                    <th className="text-left py-3 px-4 font-semibold text-red-800">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold text-red-800">Comercial</th>
                    <th className="text-center py-3 px-4 font-semibold text-red-800">Días sin Contacto</th>
                    <th className="text-center py-3 px-4 font-semibold text-red-800">Urgencia</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas_clientes_muertos.map((a) => (
                    <tr key={a.cliente_id} className="border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-700 max-w-[250px] truncate">{a.cliente_nombre}</td>
                      <td className="py-3 px-4 text-slate-600">{a.comercial_nombre}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{a.dias_sin_contacto}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.dias_sin_contacto > 30 ? 'bg-red-100 text-red-700' :
                          a.dias_sin_contacto > 20 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {a.dias_sin_contacto > 30 ? '🔴 Crítico' : a.dias_sin_contacto > 20 ? '🟠 Alto' : '🟡 Medio'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
