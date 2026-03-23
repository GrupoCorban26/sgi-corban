import React, { useState } from 'react';
import { MessageSquare, Clock, UserX, UserCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { useAnalyticsBuzon } from '@/hooks/comercial/useAnalyticsDesglosado';
import { analyticsService } from '@/services/comercial/analytics';
import { FiltrosSeccion } from './FiltrosSeccion';

export function SectionBuzon() {
    const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [comercialId, setComercialId] = useState<string | undefined>();
    const [empresa, setEmpresa] = useState<string | undefined>();

    const { data, isLoading, isError, isFetching } = useAnalyticsBuzon(fechaInicio, fechaFin, comercialId, empresa);

    const exportarAExcel = async () => {
        try {
            toast.info('Generando reporte...');
            const detalle = await analyticsService.getDetalleBuzon(fechaInicio, fechaFin, comercialId, empresa);
            if (!detalle || detalle.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }
            const wb = XLSX.utils.book_new();
            const wsData = XLSX.utils.json_to_sheet(detalle.map(row => ({
                'TELEFONO': row.telefono,
                'ESTADO': row.estado,
                'COMENTARIO': row.comentario,
                'FECHA': row.fecha,
                'COMERCIAL': row.comercial
            })));
            XLSX.utils.book_append_sheet(wb, wsData, "Buzón WhatsApp");
            XLSX.writeFile(wb, `Reporte_Buzon_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success('Reporte exportado correctamente');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Error al generar el archivo Excel');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6 mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="text-green-500" size={24} />
                Buzón WhatsApp
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
                hasData={!!data && data.por_comercial.length > 0}
            />

            {isError ? (
                <div className="p-4 text-center text-red-500 font-medium">Error al cargar métricas de Buzón WhatsApp.</div>
            ) : isLoading || !data ? (
                <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                    {/* KPIs Buzon */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {/* Total Leads */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Total de leads</p>
                                <h3 className="text-xl font-bold text-gray-900">{data.totales.total_leads}</h3>
                            </div>
                        </div>

                        {/* Convertidos */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Convertidos</p>
                                <h3 className="text-xl font-bold text-gray-900">{data.totales.total_convertidos}</h3>
                            </div>
                        </div>

                        {/* Descartados */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                                <UserX size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Descartados</p>
                                <h3 className="text-xl font-bold text-gray-900">{data.totales.total_descartados}</h3>
                            </div>
                        </div>

                        {/* Tiempo de respuesta */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Tiempo promedio de respuesta</p>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {Math.round(data.totales.avg_tiempo_respuesta_seg / 60)} min
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Tabla Buzón por Comercial */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-600 text-xs uppercase text-left">
                                    <th className="px-6 py-4 font-semibold">ASESOR</th>
                                    <th className="px-6 py-4 font-semibold text-center">ASIGNADOS</th>
                                    <th className="px-6 py-4 font-semibold text-center">CONVERTIDOS</th>
                                    <th className="px-6 py-4 font-semibold text-center">DESCARTADOS</th>
                                    <th className="px-6 py-4 font-semibold text-center">EN GESTION</th>
                                    <th className="px-6 py-4 font-semibold text-center w-32">TIEMPO RESP.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.por_comercial.map((asesor, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{asesor.nombre}</td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-600">{asesor.leads_asignados}</td>
                                        <td className="px-6 py-4 text-center font-medium text-emerald-600">{asesor.convertidos}</td>
                                        <td className="px-6 py-4 text-center font-medium text-rose-600">{asesor.descartados}</td>
                                        <td className="px-6 py-4 text-center font-medium text-amber-600">{asesor.en_gestion}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">
                                                <Clock size={12} />
                                                {Math.round(asesor.avg_tiempo_respuesta_seg / 60)} min
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.por_comercial.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium">
                                            No hay actividad en Buzón WhatsApp para el rango y/o filtros seleccionados.
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
