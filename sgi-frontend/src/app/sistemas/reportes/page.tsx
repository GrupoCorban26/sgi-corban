'use client';

import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Loader2, RefreshCw, BarChart2, TrendingUp, Users, Phone, AlertTriangle, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { useAnalytics } from '@/hooks/comercial/useAnalytics';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportesDashboard() {
    const [fechaInicio, setFechaInicio] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    const { data, isLoading, isError, refetch, isFetching } = useAnalytics(fechaInicio, fechaFin);

    const exportarAExcel = () => {
        if (!data) {
            toast.error('No hay datos para exportar');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // 1. Rendimiento Comerciales
            const wsComerciales = XLSX.utils.json_to_sheet(data.comerciales.map(c => ({
                'Agente': c.nombre,
                'Leads Atendidos': c.leads_atendidos,
                'Convertidos': c.clientes_convertidos,
                'Llamadas Realizadas': c.llamadas_realizadas,
                'Tasa Conversión (%)': c.tasa_conversion,
                'Tiempo Resp. Prom. (Min)': c.tiempo_respuesta_promedio_min || 'N/D'
            })));
            XLSX.utils.book_append_sheet(wb, wsComerciales, "Comerciales");

            // 2. Canales de Origen
            const canalesData = Object.entries(data.origenes).map(([origen, stats]) => ({
                'Origen': origen,
                'Total Leads': stats.total,
                'Convertidos': stats.convertidos,
                'Tasa Conversión (%)': stats.tasa_conversion
            }));
            const wsOrigenes = XLSX.utils.json_to_sheet(canalesData);
            XLSX.utils.book_append_sheet(wb, wsOrigenes, "Canales");

            // 3. Métricas Pipeline
            const pipelineData = [
                { Metrica: 'Total Embudo Prospectos', Valor: data.pipeline.embudo['PROSPECTO'] || 0 },
                { Metrica: 'Total Embudo Negociación', Valor: data.pipeline.embudo['EN_NEGOCIACION'] || 0 },
                { Metrica: 'Total Convertidos', Valor: data.pipeline.embudo['CLIENTE'] || 0 },
                { Metrica: 'Total Perdidos', Valor: data.pipeline.embudo['PERDIDO'] || 0 },
                { Metrica: 'Tasa Conversión General (%)', Valor: data.pipeline.tasa_conversion },
                { Metrica: 'Tasa Pérdida General (%)', Valor: data.pipeline.tasa_perdida },
                { Metrica: 'Reactivaciones Exitosas', Valor: data.pipeline.reactivaciones_exitosas }
            ];
            const wsPipeline = XLSX.utils.json_to_sheet(pipelineData);
            XLSX.utils.book_append_sheet(wb, wsPipeline, "Pipeline");

            XLSX.writeFile(wb, `Reporte_Comercial_${fechaInicio}_al_${fechaFin}.xlsx`);
            toast.success('Reporte exportado exitosamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al exportar el reporte');
        }
    };

    const chartDataCanales = useMemo(() => {
        if (!data?.origenes) return [];
        return Object.entries(data.origenes).map(([name, stats]) => ({
            name,
            total: stats.total,
            convertidos: stats.convertidos
        }));
    }, [data]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* HEADER Y FILTROS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="text-indigo-600" />
                        Dashboard de Resultados Comerciales
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Visualiza y exporta las métricas de rendimiento en tiempo real
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={fechaFin}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={20} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={exportarAExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                    >
                        <Download size={18} />
                        Exportar Excel
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                    <Loader2 size={40} className="animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Recopilando métricas...</p>
                </div>
            ) : isError ? (
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center">
                    <p className="font-semibold text-lg mb-2">Error al cargar el dashboard</p>
                    <p className="text-sm opacity-80">Verifica tu conexión o los permisos de tu perfil.</p>
                </div>
            ) : data ? (
                <div className="space-y-6">
                    {/* KPIs Principales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Tasa Conversión
                            </span>
                            <div className="text-3xl font-bold text-gray-800">
                                {data.pipeline.tasa_conversion.toFixed(1)}%
                            </div>
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                                <TrendingUp size={14} /> Del Pipeline Activo
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Nuevos Clientes
                            </span>
                            <div className="text-3xl font-bold text-gray-800">
                                {data.operativo.clientes_nuevos_periodo}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                En el período seleccionado
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Leads Pendientes
                            </span>
                            <div className="text-3xl font-bold text-amber-600">
                                {data.operativo.leads_pendientes}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                Esperando atención en Inbox
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Cumplimiento Citas
                            </span>
                            <div className="text-3xl font-bold text-indigo-600">
                                {data.operativo.citas_cumplimiento}%
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex gap-1">
                                {data.operativo.citas_terminadas} / {data.operativo.citas_total} terminadas
                            </p>
                        </div>
                    </div>

                    {/* KPIs de Gestión de Cartera */}
                    {data.gestion && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Total Gestiones
                                </span>
                                <div className="text-3xl font-bold text-gray-800">
                                    {data.gestion.total_gestiones}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1">
                                    <ClipboardList size={14} /> En el período
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Contactabilidad
                                </span>
                                <div className="text-3xl font-bold text-emerald-600">
                                    {data.gestion.tasa_contactabilidad}%
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium">
                                    De las llamadas realizadas
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Llamadas
                                </span>
                                <div className="text-3xl font-bold text-blue-600">
                                    {data.gestion.por_tipo?.LLAMADA || 0}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium">
                                    WhatsApp: {data.gestion.por_tipo?.WHATSAPP || 0} · Visitas: {data.gestion.por_tipo?.VISITA || 0}
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    ⚠️ Sin Gestión 30d
                                </span>
                                <div className={`text-3xl font-bold ${data.gestion.clientes_sin_gestion_30d > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {data.gestion.clientes_sin_gestion_30d}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1">
                                    <AlertTriangle size={14} className="text-red-500" /> Clientes abandonados
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rendimiento Comerciales */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Users size={20} className="text-indigo-500" />
                                Rendimiento por Agente
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.comerciales} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 12, fill: '#4B5563' }} />
                                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                        <Bar dataKey="clientes_convertidos" name="Convertidos" fill="#10b981" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="leads_atendidos" name="Leads Atendidos" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Rendimiento Canales / Origen */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <BarChart2 size={20} className="text-indigo-500" />
                                Captación por Canal (Origen)
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartDataCanales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4B5563' }} />
                                        <YAxis />
                                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                                        <Legend />
                                        <Bar dataKey="total" name="Total Leads" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="convertidos" name="Convertidos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detalle Operativo de los Agentes */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Phone size={18} className="text-indigo-500" />
                                Detalle Operativo de Ejecutivos
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-gray-600 text-xs uppercase text-left">
                                        <th className="px-6 py-4 font-semibold">Agente</th>
                                        <th className="px-6 py-4 font-semibold text-center">Leads Totales</th>
                                        <th className="px-6 py-4 font-semibold text-center">Conversiones</th>
                                        <th className="px-6 py-4 font-semibold text-center">Tasa %</th>
                                        <th className="px-6 py-4 font-semibold text-center">Llamadas Realizadas</th>
                                        <th className="px-6 py-4 font-semibold text-center">Gestiones</th>
                                        <th className="px-6 py-4 font-semibold text-center">Tiempo Resp. Prom.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.comerciales.map((agente, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-800">{agente.nombre}</td>
                                            <td className="px-6 py-4 text-center">{agente.leads_atendidos}</td>
                                            <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{agente.clientes_convertidos}</td>
                                            <td className="px-6 py-4 text-center font-mono">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${agente.tasa_conversion > 15 ? 'bg-green-100 text-green-700' :
                                                    agente.tasa_conversion > 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {agente.tasa_conversion}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{agente.llamadas_realizadas}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-indigo-600">{agente.gestiones_realizadas || 0}</td>
                                            <td className="px-6 py-4 text-center text-gray-500">
                                                {agente.tiempo_respuesta_promedio_min !== null && agente.tiempo_respuesta_promedio_min !== undefined ? `${agente.tiempo_respuesta_promedio_min} min` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.comerciales.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-medium">
                                                No hay intervenciones comerciales en este rango de fechas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
