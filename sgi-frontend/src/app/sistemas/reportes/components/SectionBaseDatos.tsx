import React, { useState } from 'react';
import { Phone, CheckCircle2, Target } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { useAnalyticsBaseDatos } from '@/hooks/comercial/useAnalyticsDesglosado';
import { FiltrosSeccion } from './FiltrosSeccion';

export function SectionBaseDatos() {
    const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [comercialId, setComercialId] = useState<string | undefined>();
    const [empresa, setEmpresa] = useState<string | undefined>();

    const { data, isLoading, isError, isFetching } = useAnalyticsBaseDatos(fechaInicio, fechaFin, comercialId, empresa);

    const exportarAExcel = () => {
        if (!data || data.por_comercial.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }
        try {
            const wb = XLSX.utils.book_new();
            const wsData = XLSX.utils.json_to_sheet(data.por_comercial.map(c => ({
                'Agente': c.nombre,
                'Total de llamadas': c.total_llamadas,
                'Llamadas contestadas': c.llamadas_contestadas,
                'Llamadas efectivas': c.llamadas_efectivas
            })));
            XLSX.utils.book_append_sheet(wb, wsData, "Base de Datos");
            XLSX.writeFile(wb, `Reporte_Base_Datos_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success('Reporte exportado correctamente');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Error al generar el archivo Excel');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Phone className="text-blue-500" size={24} />
                Reporte de Base de Datos
            </h2>
            
            <FiltrosSeccion
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                setFechaInicio={setFechaInicio}
                setFechaFin={setFechaFin}
                comercialId={comercialId}
                setComercialId={setComercialId}
                empresa={empresa}
                setEmpresa={setEmpresa}
                onExport={exportarAExcel}
                isExporting={false}
                hasData={!!data && data.por_comercial.length > 0}
            />

            {isError ? (
                <div className="p-4 text-center text-red-500 font-medium">Error al cargar métricas de Base de Datos.</div>
            ) : isLoading || !data ? (
                <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                    {/* KPIs Base de Datos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Total Llamadas */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <Phone size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total de llamadas</p>
                                <h3 className="text-2xl font-bold text-gray-900">{data.totales.total_llamadas}</h3>
                            </div>
                        </div>

                        {/* Contestadas */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="w-full">
                                <p className="text-sm font-medium text-gray-500 mb-1">Llamadas contestadas</p>
                                <div className="flex items-end justify-between w-full">
                                    <h3 className="text-2xl font-bold text-gray-900">{data.totales.llamadas_contestadas}</h3>
                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">
                                        {data.totales.pct_contestadas}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Efectivas */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Target size={24} />
                            </div>
                            <div className="w-full">
                                <p className="text-sm font-medium text-gray-500 mb-1">Llamadas efectivas</p>
                                <div className="flex items-end justify-between w-full">
                                    <h3 className="text-2xl font-bold text-gray-900">{data.totales.llamadas_efectivas}</h3>
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-md">
                                        {data.totales.pct_efectivas}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla Base de Datos por Comercial */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
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
                                {data.por_comercial.map((agente, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{agente.nombre}</td>
                                        <td className="px-6 py-4 text-center text-blue-600 font-semibold">{agente.total_llamadas}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{agente.llamadas_contestadas}</td>
                                        <td className="px-6 py-4 text-center text-indigo-600 font-semibold">{agente.llamadas_efectivas}</td>
                                    </tr>
                                ))}
                                {data.por_comercial.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-medium">
                                            No hay actividad en Base de Datos para el rango y/o filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
