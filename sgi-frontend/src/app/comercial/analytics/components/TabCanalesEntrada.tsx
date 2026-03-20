'use client';

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Users,
  Globe, MessageCircle, ArrowRightLeft, BarChart3
} from 'lucide-react';
import { AnalyticsBuzonResponse } from '@/types/analytics-buzon';
import { StatCard, PieChartCard, BarChartCard, LineChartCard } from '@/components/ui/charts';

interface TabCanalesEntradaProps {
  data: AnalyticsBuzonResponse;
}

type TabCanal = 'whatsapp' | 'web';

export default function TabCanalesEntrada({ data }: TabCanalesEntradaProps) {
  const [tabCanal, setTabCanal] = useState<TabCanal>('whatsapp');

  const formatTiempoRespuesta = (minutos: number | null): string => {
    if (minutos === null || minutos === undefined) return 'N/A';
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}m`;
  };

  const COLORES_CANAL = ['#6366f1', '#f97316'];
  const COLORES_MOTIVOS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#8b5cf6', '#64748b'];

  const { general, por_canal, comparativo } = data;

  return (
    <div className="space-y-8">
      {/* NIVEL 1 — VISTA GENERAL */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-600" />
          Vista General
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Leads" value={general.total_leads} icon={<Users size={24} />} color="blue" />
          <StatCard title="Convertidos" value={`${general.total_convertidos} (${general.tasa_conversion}%)`} icon={<TrendingUp size={24} />} color="green" />
          <StatCard title="Descartados" value={`${general.total_descartados} (${general.tasa_descarte}%)`} icon={<TrendingDown size={24} />} color="red" />
          <StatCard title="Tiempo Respuesta Prom." value={formatTiempoRespuesta(general.tiempo_respuesta_promedio_minutos)} icon={<Clock size={24} />} color="orange" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PieChartCard title="Proporción por Canal" data={general.proporcion_canal} colors={COLORES_CANAL} isDonut={true} />
          <LineChartCard
            title="Tendencia Mensual"
            data={general.tendencia_mensual}
            xKey="mes"
            series={[
              { key: 'whatsapp', label: 'WhatsApp', color: '#6366f1' },
              { key: 'web', label: 'Web', color: '#f97316' },
              { key: 'total', label: 'Total', color: '#1e293b' },
            ]}
            className="lg:col-span-2"
          />
        </div>
      </section>

      {/* NIVEL 2 — POR CANAL */}
      <section>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <ArrowRightLeft size={20} className="text-indigo-600" />
          Detalle por Canal
        </h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setTabCanal('whatsapp')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tabCanal === 'whatsapp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button
            onClick={() => setTabCanal('web')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tabCanal === 'web' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe size={16} /> Web
          </button>
        </div>

        {tabCanal === 'whatsapp' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Nuevos', value: por_canal.whatsapp.nuevos, color: 'bg-blue-50 text-blue-700' },
                { label: 'Pendientes', value: por_canal.whatsapp.pendientes, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'En Gestión', value: por_canal.whatsapp.en_gestion, color: 'bg-purple-50 text-purple-700' },
                { label: 'Cotizados', value: por_canal.whatsapp.cotizados, color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Cierre', value: por_canal.whatsapp.cierre, color: 'bg-green-50 text-green-700' },
                { label: 'Descartados', value: por_canal.whatsapp.descartados, color: 'bg-red-50 text-red-700' },
              ].map((item) => (
                <div key={item.label} className={`${item.color} rounded-2xl p-4 text-center`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-1 opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PieChartCard title="Motivos de Descarte — WhatsApp" data={por_canal.whatsapp.motivos_descarte} colors={COLORES_MOTIVOS} isDonut={false} />
              <BarChartCard
                title="Rendimiento por Comercial — WhatsApp"
                data={por_canal.whatsapp.leads_por_comercial}
                xKey="nombre"
                bars={[
                  { key: 'convertidos', label: 'Convertidos', color: '#22c55e' },
                  { key: 'descartados', label: 'Descartados', color: '#ef4444' },
                ]}
              />
            </div>
          </div>
        )}

        {tabCanal === 'web' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Nuevos', value: por_canal.web.nuevos, color: 'bg-blue-50 text-blue-700' },
                { label: 'Pendientes', value: por_canal.web.pendientes, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'En Gestión', value: por_canal.web.en_gestion, color: 'bg-purple-50 text-purple-700' },
                { label: 'Convertidos', value: por_canal.web.convertidos, color: 'bg-green-50 text-green-700' },
                { label: 'Descartados', value: por_canal.web.descartados, color: 'bg-red-50 text-red-700' },
              ].map((item) => (
                <div key={item.label} className={`${item.color} rounded-2xl p-4 text-center`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-1 opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PieChartCard title="Motivos de Descarte — Web" data={por_canal.web.motivos_descarte} colors={COLORES_MOTIVOS} isDonut={false} />
              <BarChartCard
                title="Leads por Página de Origen"
                data={por_canal.web.leads_por_pagina}
                xKey="name"
                bars={[{ key: 'value', label: 'Leads', color: '#3b82f6' }]}
                layout="vertical"
              />
              <BarChartCard
                title="Rendimiento por Comercial — Web"
                data={por_canal.web.leads_por_comercial}
                xKey="nombre"
                bars={[
                  { key: 'convertidos', label: 'Convertidos', color: '#22c55e' },
                  { key: 'descartados', label: 'Descartados', color: '#ef4444' },
                ]}
              />
            </div>
          </div>
        )}
      </section>

      {/* NIVEL 3 — COMPARATIVO */}
      <section className="pb-8">
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-600" />
          Comparativo WhatsApp vs Web
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard
            title="Métricas Comparativas"
            data={comparativo.metricas}
            xKey="metrica"
            bars={[
              { key: 'whatsapp', label: 'WhatsApp', color: '#6366f1' },
              { key: 'web', label: 'Web', color: '#f97316' },
            ]}
          />
          <BarChartCard
            title="Leads por Comercial y Canal"
            data={comparativo.rendimiento_por_comercial}
            xKey="nombre"
            bars={[
              { key: 'whatsapp', label: 'WhatsApp', color: '#6366f1' },
              { key: 'web', label: 'Web', color: '#f97316' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
