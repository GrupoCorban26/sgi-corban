'use client';

import React, { useState } from 'react';
import { 
  Download, 
  BarChart3, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  TrendingDown, 
  Users, 
  Briefcase 
} from 'lucide-react';
import { toast } from 'sonner';
import { CotizacionesAnalyticsResponse } from '@/types/analytics-comercial';
import { BarChartCard, PieChartCard, StatCard } from '@/components/ui/charts';
import { analyticsComercialService } from '@/services/comercial/analytics-comercial';

interface TabRendimientoCotizacionesProps {
  data: CotizacionesAnalyticsResponse;
  fechaInicio: string;
  fechaFin: string;
  clienteId?: number | null;
}

export default function TabRendimientoCotizaciones({ 
  data, 
  fechaInicio, 
  fechaFin,
  clienteId
}: TabRendimientoCotizacionesProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const { 
    kpis, 
    rendimiento_comerciales, 
    rendimiento_empresas = [], 
    distribucion_carga, 
    distribucion_operacion, 
    distribucion_segmentacion, 
    motivos_caida 
  } = data;

  // Determinar la agrupación por defecto basada en el número de equipos en los datos.
  // Un jefe con subordinados se considera activo si su comercial_id aparece como jefe_id de alguien más.
  const jefesConSubordinados = rendimiento_comerciales.filter(c => 
    rendimiento_comerciales.some(other => other.jefe_id === c.comercial_id)
  );

  // Si hay más de un jefe comercial en los datos con subordinados, es una vista multi-equipo (jefe de jefes, admin, etc.)
  const mostrarComoEquipoDefecto = jefesConSubordinados.length > 1;

  const [agrupacion, setAgrupacion] = useState<'comercial' | 'equipo' | 'empresa'>(
    mostrarComoEquipoDefecto ? 'equipo' : 'comercial'
  );

  // Formatear data para el gráfico de barras agrupadas según la agrupación seleccionada
  let chartData: { nombre: string; 'Tarjeta Cerrada': number; 'Tarjeta Perdida': number }[] = [];

  if (agrupacion === 'comercial') {
    chartData = rendimiento_comerciales.map((c) => ({
      nombre: c.iniciales || c.nombre.split(' ')[0],
      'Tarjeta Cerrada': c.cierres_exitosos,
      'Tarjeta Perdida': c.negociaciones_caidas
    }));
  } else if (agrupacion === 'equipo') {
    const equiposMap: Record<string, { ganadas: number; perdidas: number }> = {};
    rendimiento_comerciales.forEach((c) => {
      // Si el comercial es jefe, su equipo es su propio nombre.
      // De lo contrario, pertenece al equipo de su jefe.
      const esJefe = rendimiento_comerciales.some(other => other.jefe_id === c.comercial_id);
      const eqNombre = esJefe ? c.nombre : (c.jefe_nombre || 'Sin Equipo');
      
      if (!equiposMap[eqNombre]) {
        equiposMap[eqNombre] = { ganadas: 0, perdidas: 0 };
      }
      equiposMap[eqNombre].ganadas += c.cierres_exitosos;
      equiposMap[eqNombre].perdidas += c.negociaciones_caidas;
    });

    chartData = Object.entries(equiposMap).map(([eqName, stats]) => ({
      nombre: eqName.length > 20 ? eqName.substring(0, 18) + '...' : eqName,
      'Tarjeta Cerrada': stats.ganadas,
      'Tarjeta Perdida': stats.perdidas
    }));
    
    // Ordenar de mayor a menor volumen total
    chartData.sort((a, b) => 
      (b['Tarjeta Cerrada'] + b['Tarjeta Perdida']) - (a['Tarjeta Cerrada'] + a['Tarjeta Perdida'])
    );
  } else {
    // agrupacion === 'empresa'
    chartData = rendimiento_empresas.map((e) => ({
      nombre: e.nombre.length > 20 ? e.nombre.substring(0, 18) + '...' : e.nombre,
      'Tarjeta Cerrada': e.cierres_exitosos,
      'Tarjeta Perdida': e.negociaciones_caidas
    }));
  }

  // Alto dinámico para evitar espacios vacíos gigantes o empaquetamiento cuando hay muchos registros
  const chartHeight = Math.max(320, chartData.length * 40 + 80);

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const blob = await analyticsComercialService.exportarCotizacionesExcel(fechaInicio, fechaFin, clienteId);
      
      // Crear enlace de descarga e iniciarla
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_cotizaciones_${fechaInicio}_a_${fechaFin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('¡Reporte en Excel descargado con éxito!');
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar los datos a Excel');
    } finally {
      setIsDownloading(false);
    }
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 60) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (rate >= 35) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ─── BOTÓN DE EXPORTACIÓN Y TÍTULO ─────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" />
            Resumen General de Cotizaciones
          </h3>
          <p className="text-xs text-slate-400 font-medium">Cotizaciones del {fechaInicio} al {fechaFin}</p>
        </div>
        
        <button
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-emerald-100 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isDownloading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generando Excel...
            </>
          ) : (
            <>
              <Download size={14} />
              Exportar Reporte Completo (Excel)
            </>
          )}
        </button>
      </div>

      {/* ─── TARJETAS DE KPIS PRINCIPALES ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tarjetas de Cotización"
          value={kpis.total_tarjetas}
          icon={<Briefcase size={22} />}
          color="blue"
        />
        <StatCard
          title="Cotizaciones (Vías)"
          value={kpis.total_cotizaciones}
          icon={<Users size={22} />}
          color="purple"
        />
        <StatCard
          title="Cierres COR Ganados"
          value={kpis.total_ganadas}
          icon={<TrendingUp size={22} />}
          color="green"
        />
        <StatCard
          title="Cotizados Perdidos"
          value={kpis.total_perdidas}
          icon={<TrendingDown size={22} />}
          color="red"
        />
        <StatCard
          title="Conversión Promedio"
          value={`${kpis.tasa_conversion}%`}
          icon={<Target size={22} />}
          color={kpis.tasa_conversion >= 50 ? 'green' : kpis.tasa_conversion >= 30 ? 'orange' : 'red'}
        />
      </div>

      {/* ─── GRÁFICO COMPARATIVO CONFIGURABLE ─────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Volumen y Cierres {agrupacion === 'comercial' ? 'por Comercial' : agrupacion === 'equipo' ? 'por Equipo' : 'por Empresa'}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {agrupacion === 'comercial' 
                ? 'Comparativa de cotizaciones ganadas vs perdidas agrupadas por agente comercial' 
                : agrupacion === 'equipo' 
                ? 'Comparativa agrupada por equipo comercial (Jefe de Equipo)' 
                : 'Comparativa agrupada por cliente (Empresa)'}
            </p>
          </div>

          {/* Selector de Agrupación estilo Píldora */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setAgrupacion('comercial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                agrupacion === 'comercial'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Comercial
            </button>
            <button
              onClick={() => setAgrupacion('equipo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                agrupacion === 'equipo'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Equipo
            </button>
            <button
              onClick={() => setAgrupacion('empresa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                agrupacion === 'empresa'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Empresa
            </button>
          </div>
        </div>

        <div style={{ height: chartHeight }}>
          <BarChartCard
            title=""
            data={chartData}
            xKey="nombre"
            layout="vertical"
            height={chartHeight}
            xAxisDomain={[0, (max: number) => Math.max(30, Math.ceil(max))]}
            bars={[
              { key: 'Tarjeta Cerrada', label: 'Cierre', color: '#10b981' }, // Emerald
              { key: 'Tarjeta Perdida', label: 'Caído', color: '#f43f5e' } // Rose
            ]}
          />
        </div>
      </section>

      {/* ─── FILA DE DISTRIBUCIONES (GRÁFICOS PIE) ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Distribución Carga */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Distribución por Carga
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">Modalidades de cotización seleccionadas</p>
          </div>
          {distribucion_carga.length > 0 ? (
            <div className="flex items-center justify-center">
              <PieChartCard
                title=""
                data={distribucion_carga.map(dc => ({ name: dc.tipo_carga_nombre, value: dc.cantidad }))}
                colors={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#94a3b8']}
                isDonut={true}
              />
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12 text-xs font-medium">Sin datos de carga</p>
          )}
        </section>

        {/* Atribución Cierre */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Segmentación del Cierre
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">Origen de atribución del cierre COR</p>
          </div>
          {distribucion_segmentacion.length > 0 ? (
            <div className="flex items-center justify-center">
              <PieChartCard
                title=""
                data={distribucion_segmentacion.map(ds => ({ name: ds.segmentacion_nombre, value: ds.cantidad }))}
                colors={['#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#64748b']}
                isDonut={true}
              />
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12 text-xs font-medium">Sin datos de cierres en el periodo</p>
          )}
        </section>

        {/* Vía de Operación */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Vía de Operación
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">Importaciones vs Exportaciones cotizadas</p>
          </div>
          {distribucion_operacion.length > 0 ? (
            <div className="flex items-center justify-center">
              <PieChartCard
                title=""
                data={distribucion_operacion.map(do_item => ({ name: do_item.tipo_operacion, value: do_item.cantidad }))}
                colors={['#3b82f6', '#f97316']}
                isDonut={false}
              />
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12 text-xs font-medium">Sin datos de operación</p>
          )}
        </section>
      </div>

      {/* ─── FILA INFERIOR: MOTIVOS CAÍDA & TABLA DETALLE ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Motivos de Caída */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-500" />
              Motivos de Negociaciones Caídas
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">Principales razones por las que se perdieron los cotizados</p>
          </div>

          {motivos_caida.length > 0 ? (
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {motivos_caida.map((m) => {
                const barPct = m.porcentaje;
                return (
                  <div key={m.motivo} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{m.motivo}</span>
                      <span className="text-slate-500">{m.cantidad} ({m.porcentaje}%)</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12 flex-1 flex flex-col items-center justify-center">
              <AlertTriangle size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-bold">Sin negociaciones caídas</p>
              <p className="text-[10px] text-slate-400">No se registraron pérdidas en el periodo seleccionado.</p>
            </div>
          )}
        </section>

        {/* Tabla Detallada de Rendimiento */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Desempeño Detallado por Comercial
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">Efectividad de cierre e indicador de conversión individual</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr className="font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 bg-slate-50">Comercial</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Creadas</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Ganadas</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Perdidas</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Pendientes</th>
                  <th className="py-3 px-4 text-center bg-slate-50">Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rendimiento_comerciales.map((c) => (
                  <tr key={c.comercial_id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center text-[10px] uppercase shrink-0">
                        {c.iniciales || c.nombre.substring(0, 2)}
                      </span>
                      <span className="truncate">{c.nombre}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{c.cotizados_creados}</td>
                    <td className="py-3 px-3 text-center text-emerald-600 font-bold">{c.cierres_exitosos}</td>
                    <td className="py-3 px-3 text-center text-rose-600 font-bold">{c.negociaciones_caidas}</td>
                    <td className="py-3 px-3 text-center text-slate-400">{c.cotizaciones_pendientes}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg font-bold border ${getConversionColor(c.tasa_efectividad)}`}>
                        {c.tasa_efectividad}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </div>
  );
}
