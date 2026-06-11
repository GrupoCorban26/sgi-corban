'use client';

import React, { useState } from 'react';
import { BarChart3, Calendar, RefreshCw, Loader2, List } from 'lucide-react';
import { useAnalyticsCotizaciones, useEmpresasGrupo } from '@/hooks/comercial/useAnalyticsComercial';
import { useClientes } from '@/hooks/comercial/useClientes';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import TabRendimientoCotizaciones from './components/TabRendimientoCotizaciones';
import TabDetalleCotizaciones from './components/TabDetalleCotizaciones';

export default function AnalyticsComercialPage() {
  const hoy = new Date();
  const formatFecha = (d: Date) => d.toISOString().split('T')[0];
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Rango de fechas para Cotizaciones
  const [fechaInicio, setFechaInicio] = useState(formatFecha(primerDia));
  const [fechaFin, setFechaFin] = useState(formatFecha(hoy));

  // Filtro por Empresa (Cliente)
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Filtro por Empresa del Grupo
  const [empresaId, setEmpresaId] = useState<number | null>(null);

  // Tab activo
  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle'>('resumen');

  // Cargar lista de clientes para el dropdown
  const { clientes, isLoading: loadingClientes } = useClientes(
    clientSearch,
    null,
    null,
    null,
    1,
    50
  );

  // Cargar lista de empresas del grupo
  const { data: empresasGrupo = [], isLoading: loadingEmpresas } = useEmpresasGrupo();

  // Data hook
  const cotizacionesQuery = useAnalyticsCotizaciones(fechaInicio, fechaFin, clienteId, empresaId);

  const isLoading = cotizacionesQuery.isLoading;
  const isError = cotizacionesQuery.isError;

  const refetchAll = () => {
    cotizacionesQuery.refetch();
  };

  const handleClientChange = (val: number | string | null) => {
    if (val === 'all' || val === null) {
      setClienteId(null);
    } else {
      setClienteId(Number(val));
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
        
        {/* HEADER — Consistente con Seguimiento */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100/50 shadow-sm">
              <BarChart3 className="text-indigo-600" size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics Comercial</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Rendimiento, conversiones y efectividad del Kanban de cotizaciones</p>
            </div>
          </div>
          
          {/* FILTROS: Empresa y Fechas */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro de Empresa del Grupo */}
            <div className="w-64">
              <SearchableSelect
                value={empresaId || 'all'}
                onChange={(val) => setEmpresaId(val === 'all' || val === null ? null : Number(val))}
                options={[
                  { id: 'all', label: 'Todas las Empresas (Grupo)' },
                  ...empresasGrupo.map((e) => ({
                    id: e.id,
                    label: e.razon_social,
                    subLabel: e.ruc || undefined
                  }))
                ]}
                placeholder="Empresa (Grupo)"
                searchPlaceholder="Buscar empresa..."
                loading={loadingEmpresas}
              />
            </div>

            {/* Filtro de Cliente */}
            <div className="w-64">
              <SearchableSelect
                value={clienteId || 'all'}
                onChange={handleClientChange}
                onSearch={setClientSearch}
                options={[
                  { id: 'all', label: 'Todos los Clientes' },
                  ...clientes.map((c) => ({
                    id: c.id,
                    label: c.razon_social,
                    subLabel: c.ruc || undefined
                  }))
                ]}
                placeholder="Todos los Clientes"
                searchPlaceholder="Buscar cliente..."
                loading={loadingClientes}
              />
            </div>

            {/* Filtro de Rango de Fecha */}
            <div className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-sm">
              <Calendar size={15} className="text-slate-400" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 border-none outline-none focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 font-bold px-1 uppercase">al</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 border-none outline-none focus:ring-0 cursor-pointer"
              />
            </div>
            <button
              onClick={refetchAll}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 bg-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS (TABS STYLE PILL) */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'resumen'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={14} />
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('detalle')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'detalle'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={14} />
            Detalle
          </button>
        </div>

        {/* STATE — Skeleton loading unificado */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-indigo-500 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Cargando analytics...</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart3 size={48} className="mb-3 opacity-40" />
            <p className="text-base font-semibold text-slate-600">Error al cargar analytics</p>
            <p className="text-xs text-slate-400 mt-1">Revisa tu conexión e intenta nuevamente</p>
            <button
              onClick={refetchAll}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer text-sm font-semibold shadow-md shadow-indigo-200/50"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* CONTENT */}
        {!isLoading && !isError && cotizacionesQuery.data && (
          activeTab === 'resumen' ? (
            <TabRendimientoCotizaciones 
              data={cotizacionesQuery.data} 
              fechaInicio={fechaInicio} 
              fechaFin={fechaFin} 
              clienteId={clienteId}
              empresaId={empresaId}
            />
          ) : (
            <TabDetalleCotizaciones 
              data={cotizacionesQuery.data} 
            />
          )
        )}
    </div>
  );
}
