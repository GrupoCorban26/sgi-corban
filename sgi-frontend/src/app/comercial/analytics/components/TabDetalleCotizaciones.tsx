'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Briefcase, TrendingUp, TrendingDown, Target, HelpCircle } from 'lucide-react';
import { CotizacionesAnalyticsResponse, ComercialCotizacionesRendimiento } from '@/types/analytics-comercial';

interface TabDetalleCotizacionesProps {
  data: CotizacionesAnalyticsResponse;
}

export default function TabDetalleCotizaciones({ data }: TabDetalleCotizacionesProps) {
  const { rendimiento_comerciales = [] } = data;
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const toggleExpandido = (id: number) => {
    setExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'cerrado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      case 'caido':
        return 'bg-rose-50 text-rose-700 border-rose-150';
      case 'cotizado':
        return 'bg-sky-50 text-sky-700 border-sky-150';
      case 'en seguimiento':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-150';
    }
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 60) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (rate >= 35) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ─── ENCABEZADO DE SECCIÓN ───────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Desglose Detallado por Comercial
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Haz clic en una fila de comercial para ver la lista completa de sus cotizaciones.
          </p>
        </div>
      </div>

      {/* ─── TABLA DE COMERCIALES CON ACORDEÓN ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {rendimiento_comerciales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30 text-indigo-500" />
            <p className="text-sm font-semibold">No se encontraron comerciales en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">Comercial</th>
                  <th className="py-4 px-4 text-center">Creadas</th>
                  <th className="py-4 px-4 text-center">Ganadas</th>
                  <th className="py-4 px-4 text-center">Perdidas</th>
                  <th className="py-4 px-4 text-center">Pendientes</th>
                  <th className="py-4 px-5 text-center">Conversión</th>
                  <th className="py-4 px-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rendimiento_comerciales.map((c) => {
                  const expandido = expandidos.has(c.comercial_id);
                  return (
                    <React.Fragment key={c.comercial_id}>
                      
                      {/* Fila Resumen del Comercial */}
                      <tr
                        onClick={() => toggleExpandido(c.comercial_id)}
                        className={`cursor-pointer hover:bg-slate-50/50 transition-colors font-medium text-slate-700 ${
                          expandido ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-5 font-bold text-slate-800 flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center text-[10px] uppercase shrink-0">
                            {c.iniciales || c.nombre.substring(0, 2)}
                          </span>
                          <div className="flex flex-col">
                            <span className="truncate text-slate-800">{c.nombre}</span>
                            {c.jefe_nombre && (
                              <span className="text-[10px] text-slate-400 font-normal">Equipo: {c.jefe_nombre}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{c.cotizados_creados}</td>
                        <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{c.cierres_exitosos}</td>
                        <td className="py-3.5 px-4 text-center text-rose-600 font-bold">{c.negociaciones_caidas}</td>
                        <td className="py-3.5 px-4 text-center text-slate-400">{c.cotizaciones_pendientes}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg font-bold border ${getConversionColor(c.tasa_efectividad)}`}>
                            {c.tasa_efectividad}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                      </tr>

                      {/* Fila Detalle del Comercial */}
                      {expandido && (
                        <tr>
                          <td colSpan={7} className="px-5 py-0 bg-slate-50/30">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl my-3 p-4 shadow-inner space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Briefcase size={13} className="text-indigo-500" />
                                  Listado de Cotizaciones — {c.nombre}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-150 px-2 py-0.5 rounded-md">
                                  {c.detalle_cotizaciones?.length || 0} Registros
                                </span>
                              </div>

                              {!c.detalle_cotizaciones || c.detalle_cotizaciones.length === 0 ? (
                                <p className="text-xs text-center text-slate-400 py-4 font-medium">
                                  No hay registros de cotizaciones en el rango de fechas seleccionado.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-150/60 bg-white">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150/60">
                                        <th className="py-2.5 px-3">Cliente</th>
                                        <th className="py-2.5 px-3">Título / Carga</th>
                                        <th className="py-2.5 px-3 text-center">Tipo de Carga</th>
                                        <th className="py-2.5 px-3 text-center">Servicio</th>
                                        <th className="py-2.5 px-3 text-center">Incoterm</th>
                                        <th className="py-2.5 px-3 text-center">Veces Cotizado</th>
                                        <th className="py-2.5 px-3 text-center">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-600">
                                      {c.detalle_cotizaciones.map((cot, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="py-2 px-3 font-semibold text-slate-800 break-words max-w-[200px]">
                                            {cot.cliente}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-slate-700 break-words max-w-[250px]">
                                            {cot.titulo}
                                          </td>
                                          <td className="py-2 px-3 text-center truncate">{cot.tipo_carga}</td>
                                          <td className="py-2 px-3 text-center truncate">{cot.servicio}</td>
                                          <td className="py-2 px-3 text-center font-bold text-slate-700">{cot.incoterm}</td>
                                          <td className="py-2 px-3 text-center font-bold text-indigo-600">{cot.veces_cotizado}</td>
                                          <td className="py-2 px-3 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${getEstadoColor(cot.estado)}`}>
                                              {cot.estado}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
