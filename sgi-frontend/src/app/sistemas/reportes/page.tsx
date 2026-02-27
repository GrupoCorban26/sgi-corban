'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/comercial/useAnalytics';
import {
    Calendar as CalendarIcon,
    Download,
    Phone,
    CheckCircle2,
    Target,
    ClipboardList,
    Users,
    TrendingUp
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ReportesDashboard() {
    const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const { data, isLoading, isError, refetch, isFetching } = useAnalytics(fechaInicio, fechaFin);

    const exportarAExcel = () => {
        if (!data) {
            toast.error('No hay datos para exportar');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // 1. Reporte de Base de Datos
            const wsBaseDatos = XLSX.utils.json_to_sheet(data.base_datos.por_comercial.map(c => ({
                'Agente': c.nombre,
                'Total de llamadas': c.total_llamadas,
                'Llamadas contestadas': c.llamadas_contestadas,
                'Llamadas efectivas': c.llamadas_efectivas
            })));
            XLSX.utils.book_append_sheet(wb, wsBaseDatos, "Base de Datos");

            // 2. Reporte de Mantenimiento de Cartera
            const wsCartera = XLSX.utils.json_to_sheet(data.cartera.por_comercial.map(c => ({
                'Agente': c.nombre,
                'Seguimiento de cartera': c.seguimiento_carga,
                'Fidelización': c.fidelizacion,
                'Dudas del cliente': c.dudas_cliente,
                'Quiere cotización': c.quiere_cotizacion
            })));
            XLSX.utils.book_append_sheet(wb, wsCartera, "Cartera");

            XLSX.writeFile(wb, `Reporte_General_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success('Reporte exportado correctamente');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Error al generar el archivo Excel');
        }
    };

    if (isError) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-red-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                    <TrendingUp className="text-red-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Error al cargar métricas</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">No se pudieron obtener los datos del servidor. Por favor, intenta nuevamente más tarde.</p>
                <button
                    onClick={() => refetch()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    Reintentar conexión
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera y Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reporte General</h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <CalendarIcon size={14} />
                        Período: {format(new Date(fechaInicio), 'dd MMM, yyyy', { locale: es })} - {format(new Date(fechaFin), 'dd MMM, yyyy', { locale: es })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={exportarAExcel}
                        disabled={isLoading || !data}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                        <Download size={16} />
                        Exportar Excel
                    </button>
                </div>
            </div>

            {isLoading || !data ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Calculando métricas en tiempo real...</p>
                </div>
            ) : (
                <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>

                    {/* ======================================================= */}
                    {/* SECCIÓN 1: REPORTE DE BASE DE DATOS                     */}
                    {/* ======================================================= */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                            <Phone className="text-blue-500" size={24} />
                            Reporte de Base de Datos
                        </h2>

                        {/* KPIs Base de Datos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* Total Llamadas */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total de llamadas</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{data.base_datos.totales.total_llamadas}</h3>
                                </div>
                            </div>

                            {/* Contestadas */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div className="w-full">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Llamadas contestadas</p>
                                    <div className="flex items-end justify-between w-full">
                                        <h3 className="text-2xl font-bold text-gray-900">{data.base_datos.totales.llamadas_contestadas}</h3>
                                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                                            {data.base_datos.totales.pct_contestadas}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Efectivas */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Target size={24} />
                                </div>
                                <div className="w-full">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Llamadas efectivas</p>
                                    <div className="flex items-end justify-between w-full">
                                        <h3 className="text-2xl font-bold text-gray-900">{data.base_datos.totales.llamadas_efectivas}</h3>
                                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                                            {data.base_datos.totales.pct_efectivas}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabla Base de Datos por Comercial */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr className="text-gray-600 text-xs uppercase text-left">
                                            <th className="px-6 py-4 font-semibold">Comercial</th>
                                            <th className="px-6 py-4 font-semibold text-center">Total de llamadas</th>
                                            <th className="px-6 py-4 font-semibold text-center">Llamadas contestadas</th>
                                            <th className="px-6 py-4 font-semibold text-center">Llamadas efectivas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.base_datos.por_comercial.map((agente, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{agente.nombre}</td>
                                                <td className="px-6 py-4 text-center text-blue-600 font-semibold">{agente.total_llamadas}</td>
                                                <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{agente.llamadas_contestadas}</td>
                                                <td className="px-6 py-4 text-center text-indigo-600 font-semibold">{agente.llamadas_efectivas}</td>
                                            </tr>
                                        ))}
                                        {data.base_datos.por_comercial.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-medium">
                                                    No hay actividad en Base de Datos para el rango seleccionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ======================================================= */}
                    {/* SECCIÓN 2: REPORTE DE MANTENIMIENTO DE CARTERA          */}
                    {/* ======================================================= */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2 mt-8">
                            <ClipboardList className="text-purple-500" size={24} />
                            Reporte de Mantenimiento de Cartera
                        </h2>

                        {/* KPIs Cartera */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Gestiones en Cartera (llamadas) */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total de llamadas (Gestiones)</p>
                                    <h3 className="text-3xl font-bold text-gray-900">{data.cartera.totales.total_llamadas}</h3>
                                </div>
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
                                    <Phone size={28} />
                                </div>
                            </div>

                            {/* Clientes Gestionados (Unicos) */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total de clientes gestionados</p>
                                    <h3 className="text-3xl font-bold text-gray-900">{data.cartera.totales.total_clientes_gestionados}</h3>
                                </div>
                                <div className="p-4 bg-orange-50 text-orange-600 rounded-full">
                                    <Users size={28} />
                                </div>
                            </div>
                        </div>

                        {/* Tabla Cartera por Comercial */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr className="text-gray-600 text-xs uppercase text-left">
                                            <th className="px-6 py-4 font-semibold">Comercial</th>
                                            <th className="px-6 py-4 font-semibold text-center">Seguimiento de carga</th>
                                            <th className="px-6 py-4 font-semibold text-center">Fidelización</th>
                                            <th className="px-6 py-4 font-semibold text-center">Dudas del cliente</th>
                                            <th className="px-6 py-4 font-semibold text-center">Quiere cotización</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.cartera.por_comercial.map((agente, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{agente.nombre}</td>
                                                <td className="px-6 py-4 text-center font-medium text-gray-700">{agente.seguimiento_carga}</td>
                                                <td className="px-6 py-4 text-center font-medium text-gray-700">{agente.fidelizacion}</td>
                                                <td className="px-6 py-4 text-center font-medium text-gray-700">{agente.dudas_cliente}</td>
                                                <td className="px-6 py-4 text-center font-medium text-gray-700">{agente.quiere_cotizacion}</td>
                                            </tr>
                                        ))}
                                        {data.cartera.por_comercial.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                                                    No hay gestiones de cartera para el rango seleccionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
