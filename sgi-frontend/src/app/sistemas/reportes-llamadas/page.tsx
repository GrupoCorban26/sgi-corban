'use client';

import React, { useState } from 'react';
import { useReportesLlamadas } from '@/hooks/comercial/useReportesLlamadas';
import { reportesLlamadasService } from '@/services/comercial/reportesLlamadas';
import {
    Calendar as CalendarIcon,
    Download,
    Phone,
    CheckCircle2,
    XCircle,
    ClipboardList,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function HistorialLlamadasPage() {
    const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const { data, isLoading, isError, isFetching } = useReportesLlamadas({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        page,
        page_size: pageSize
    });

    const [isExporting, setIsExporting] = useState(false);
    const handleExportar = async () => {
        try {
            setIsExporting(true);
            await reportesLlamadasService.exportarExcel({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            });
            toast.success('Reporte exportado exitosamente');
        } catch (error) {
            console.error('Error al exportar:', error);
            toast.error('Ocurrió un error al intentar exportar el reporte');
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

    return (
        <div className="space-y-6">
            {/* Cabecera y Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Phone className="text-blue-600" size={24} />
                        Historial de Llamadas
                    </h1>
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
                            onChange={(e) => {
                                setFechaInicio(e.target.value);
                                setPage(1);
                            }}
                            className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => {
                                setFechaFin(e.target.value);
                                setPage(1);
                            }}
                            className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={handleExportar}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors ${isExporting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {isExporting ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <Download size={18} />
                        )}
                        Exportar a Excel
                    </button>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <ClipboardList className="text-gray-500" size={20} />
                        Registro Detallado
                    </h2>
                    <span className="text-sm text-gray-500 font-medium pb-1">Total: {data?.total || 0} registros</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr className="text-gray-600 text-xs uppercase text-left">
                                <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
                                <th className="px-4 py-3 font-semibold">Comercial</th>
                                <th className="px-4 py-3 font-semibold">RUC</th>
                                <th className="px-4 py-3 font-semibold">Razón Social</th>
                                <th className="px-4 py-3 font-semibold">Teléfono</th>
                                <th className="px-4 py-3 font-semibold text-center">Status</th>
                                <th className="px-4 py-3 font-semibold">Caso</th>
                                <th className="px-4 py-3 font-semibold w-1/4">Comentario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                                            <p className="text-gray-500 font-medium">Cargando registros...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-red-500 font-medium">
                                        Error al cargar los datos. Por favor, intente nuevamente.
                                    </td>
                                </tr>
                            ) : data?.data && data.data.length > 0 ? (
                                data.data.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                            {format(new Date(row.fecha_llamada), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{row.comercial_nombre}</td>
                                        <td className="px-4 py-3 text-gray-600">{row.ruc}</td>
                                        <td className="px-4 py-3 text-gray-800">
                                            <div className="max-w-[200px] truncate" title={row.razon_social}>
                                                {row.razon_social}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-medium">{row.telefono}</td>
                                        <td className="px-4 py-3 text-center">
                                            {row.contesto ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                    <CheckCircle2 size={14} /> Contesto
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                    <XCircle size={14} /> No Contesto
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                                                {row.caso_nombre}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <p className="text-xs max-w-[300px] truncate" title={row.comentario || ''}>
                                                {row.comentario || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        <ClipboardList className="mx-auto text-gray-300 mb-2" size={32} />
                                        No se encontraron registros de llamadas en este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Página <span className="font-medium text-gray-800">{page}</span> de <span className="font-medium text-gray-800">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isFetching}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white text-gray-600"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isFetching}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white text-gray-600"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
