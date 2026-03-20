'use client';

import React, { useState } from 'react';
import {
  BarChart3, Target, Filter, MessageCircle,
  RefreshCw, Calendar
} from 'lucide-react';
import { useAnalyticsBuzon } from '@/hooks/comercial/useAnalyticsBuzon';
import { useRadarComercial, useEmbudoComercial } from '@/hooks/comercial/useAnalyticsComercial';
import TabRadar from './components/TabRadar';
import TabCanalesEntrada from './components/TabCanalesEntrada';
import TabEmbudo from './components/TabEmbudo';

type TabActual = 'radar' | 'canales' | 'embudo';

export default function AnalyticsComercialPage() {
  const hoy = new Date();
  const periodoDefault = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const [tab, setTab] = useState<TabActual>('radar');
  const [periodo, setPeriodo] = useState(periodoDefault);

  // Data hooks
  const radarQuery = useRadarComercial(periodo);
  const embudoQuery = useEmbudoComercial(periodo);
  const buzonQuery = useAnalyticsBuzon({});

  const isLoading =
    (tab === 'radar' && radarQuery.isLoading) ||
    (tab === 'canales' && buzonQuery.isLoading) ||
    (tab === 'embudo' && embudoQuery.isLoading);

  const isError =
    (tab === 'radar' && radarQuery.isError) ||
    (tab === 'canales' && buzonQuery.isError) ||
    (tab === 'embudo' && embudoQuery.isError);

  const refetchAll = () => {
    radarQuery.refetch();
    embudoQuery.refetch();
    buzonQuery.refetch();
  };

  const TABS: { key: TabActual; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'radar', label: 'Radar Comercial', icon: <Target size={16} />, color: 'blue' },
    { key: 'canales', label: 'Canales de Entrada', icon: <MessageCircle size={16} />, color: 'indigo' },
    { key: 'embudo', label: 'Embudo y Diagnóstico', icon: <Filter size={16} />, color: 'orange' },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-64px)] bg-slate-50/50">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics Comercial</h1>
            <p className="text-sm text-slate-400">Storytelling de rendimiento, canales y conversión</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-transparent text-sm text-slate-600 border-none outline-none"
            />
          </div>
          <button
            onClick={refetchAll}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 bg-white transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* STATE */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <p className="text-slate-500 font-medium">Cargando analytics...</p>
          </div>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <BarChart3 size={48} />
            <p className="text-lg font-medium">Error al cargar analytics</p>
            <button
              onClick={refetchAll}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      {!isLoading && !isError && (
        <>
          {tab === 'radar' && radarQuery.data && (
            <TabRadar data={radarQuery.data} />
          )}
          {tab === 'canales' && buzonQuery.data && (
            <TabCanalesEntrada data={buzonQuery.data} />
          )}
          {tab === 'embudo' && embudoQuery.data && (
            <TabEmbudo data={embudoQuery.data} />
          )}
        </>
      )}
    </div>
  );
}
