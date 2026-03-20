'use client';

import React from 'react';
import { Filter, Clock, XCircle, Zap } from 'lucide-react';
import { EmbudoResponse } from '@/types/analytics-comercial';
import { BarChartCard, PieChartCard } from '@/components/ui/charts';

interface TabEmbudoProps {
  data: EmbudoResponse;
}

// Colores del embudo de arriba a abajo (ancho a estrecho)
const COLORES_EMBUDO = ['#94a3b8', '#3b82f6', '#f97316', '#22c55e'];
const COLORES_MOTIVOS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#8b5cf6'];
const COLORES_ORIGEN = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6'];

export default function TabEmbudo({ data }: TabEmbudoProps) {
  const { embudo_conversion, tiempos_promedio, motivos_caida, efectividad_origen } = data;

  // Max value para escalar el embudo visual
  const maxEmbudo = Math.max(...embudo_conversion.map(e => e.cantidad), 1);

  return (
    <div className="space-y-8">
      {/* Embudo Visual */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Filter size={20} className="text-blue-600" />
          Embudo de Conversión
        </h3>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex flex-col items-center gap-1 max-w-xl mx-auto">
            {embudo_conversion.map((etapa, i) => {
              const widthPct = Math.max((etapa.cantidad / maxEmbudo) * 100, 20);
              return (
                <div key={etapa.etapa} className="w-full flex flex-col items-center">
                  <div
                    className="relative rounded-xl py-4 px-6 text-center transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: COLORES_EMBUDO[i] || '#64748b',
                      minWidth: '200px',
                    }}
                  >
                    <div className="text-white font-bold text-lg">{etapa.cantidad}</div>
                    <div className="text-white/90 text-sm font-medium">{etapa.etapa}</div>
                    {i > 0 && (
                      <div className="absolute -top-3 right-2 bg-white rounded-full px-2 py-0.5 text-xs font-bold shadow-sm border border-slate-200"
                        style={{ color: COLORES_EMBUDO[i] }}
                      >
                        {etapa.porcentaje_retencion}%
                      </div>
                    )}
                  </div>
                  {i < embudo_conversion.length - 1 && (
                    <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[10px] border-l-transparent border-r-transparent"
                      style={{ borderTopColor: COLORES_EMBUDO[i] }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tiempos Promedio + Motivos de Caída */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tiempos promedio por etapa */}
        <section>
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-orange-600" />
            Tiempo Promedio por Etapa
          </h3>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            {tiempos_promedio.length > 0 ? (
              <div className="space-y-4">
                {tiempos_promedio.map((t) => {
                  const maxDias = Math.max(...tiempos_promedio.map(tp => tp.dias_promedio), 1);
                  const barPct = (t.dias_promedio / maxDias) * 100;
                  return (
                    <div key={t.etapa} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{t.etapa}</span>
                        <span className="font-bold text-slate-800">{t.dias_promedio} días</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-10">
                <Clock size={40} className="mx-auto mb-2 opacity-30" />
                <p>Sin datos de tiempos para el periodo seleccionado</p>
              </div>
            )}
          </div>
        </section>

        {/* Motivos de Caída */}
        <section>
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <XCircle size={20} className="text-red-500" />
            Top Motivos de Caída
          </h3>
          {motivos_caida.length > 0 ? (
            <PieChartCard
              title=""
              data={motivos_caida.map(m => ({ name: m.motivo, value: m.cantidad }))}
              colors={COLORES_MOTIVOS}
              isDonut={true}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 py-10">
              <XCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p>Sin datos de caída para el periodo seleccionado</p>
            </div>
          )}
        </section>
      </div>

      {/* Efectividad por Origen */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Zap size={20} className="text-purple-600" />
          Efectividad por Origen de Cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {efectividad_origen.map((o, i) => (
            <div key={o.origen} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${COLORES_ORIGEN[i]}15` }}
              >
                <Zap size={24} style={{ color: COLORES_ORIGEN[i] }} />
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">{o.origen}</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">{o.tasa_conversion}%</p>
              <p className="text-xs text-slate-400">{o.cerrados} de {o.total_leads} leads</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
