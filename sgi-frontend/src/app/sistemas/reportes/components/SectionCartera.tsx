import React, { useState } from 'react';
import { ClipboardList, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { useAnalyticsCartera } from '@/hooks/comercial/useAnalyticsDesglosado';
import { FiltrosSeccion } from './FiltrosSeccion';

export function SectionCartera() {
    const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [comercialId, setComercialId] = useState<string | undefined>();
    const [empresa, setEmpresa] = useState<string | undefined>();

    const { data, isLoading, isError, isFetching } = useAnalyticsCartera(fechaInicio, fechaFin, comercialId, empresa);

    const exportarAExcel = () => {
        if (!data || data.por_comercial.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }
        try {
            const wb = XLSX.utils.book_new();
            const wsData = XLSX.utils.json_to_sheet(data.por_comercial.map(c => ({
                'Agente': c.nombre,
                'Seguimiento de carga': c.seguimiento_carga,
                'Fidelización': c.fidelizacion,
                'Dudas del cliente': c.dudas_cliente,
                'Quiere cotización': c.quiere_cotizacion,
                'TOTAL': c.total
            })));
            XLSX.utils.book_append_sheet(wb, wsData, "Cartera");
            XLSX.writeFile(wb, `Reporte_Cartera_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success('Reporte exportado correctamente');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Error al generar el archivo Excel');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6 mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList className="text-purple-500" size={24} />
                Reporte de Mantenimiento de Cartera
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
                <div className="p-4 text-center text-red-500 font-medium">Error al cargar métricas de Mantenimiento de Cartera.</div>
            ) : isLoading || !data ? (
                <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                    {/* KPIs Cartera */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Gestiones en Cartera (llamadas) */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total de llamadas (Gestiones)</p>
                                <h3 className="text-3xl font-bold text-gray-900">{data.totales.total_llamadas}</h3>
                            </div>
                            <div className="p-4 bg-purple-100 text-purple-600 rounded-lg">
                                <ClipboardList size={32} />
                            </div>
                        </div>

                        {/* Clientes Únicos Gestionados */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Clientes Únicos Gestionados</p>
                                <h3 className="text-3xl font-bold text-gray-900">{data.totales.total_clientes_gestionados}</h3>
                            </div>
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-lg">
                                <Users size={32} />
                            </div>
                        </div>
                    </div>

                    {/* Tabla Cartera por Comercial */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-600 text-xs uppercase text-left">
                                    <th className="px-6 py-4 font-semibold">Comercial</th>
                                    <th className="px-6 py-4 font-semibold text-center">Seguimiento de carga</th>
                                    <th className="px-6 py-4 font-semibold text-center">Fidelización</th>
                                    <th className="px-6 py-4 font-semibold text-center">Dudas del cliente</th>
                                    <th className="px-6 py-4 font-semibold text-center">Quiere cotización</th>
                                    <th className="px-6 py-4 font-bold text-center text-purple-700 bg-purple-50">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.por_comercial.map((agente, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{agente.nombre}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{agente.seguimiento_carga}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{agente.fidelizacion}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{agente.dudas_cliente}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{agente.quiere_cotizacion}</td>
                                        <td className="px-6 py-4 text-center font-bold text-purple-700 bg-purple-50/50">{agente.total}</td>
                                    </tr>
                                ))}
                                {data.por_comercial.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium">
                                            No hay actividad en Cartera para el rango y/o filtros seleccionados.
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
