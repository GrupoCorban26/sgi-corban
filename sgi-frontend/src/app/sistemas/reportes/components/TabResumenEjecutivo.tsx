'use client';

import React from 'react';
import {
    Phone,
    CheckCircle2,
    MessageSquare,
    Target,
    Clock,
} from 'lucide-react';
import { DashboardData } from '@/types/dashboard';
import { KpiCard } from './KpiCard';
import { ChartActividad } from './ChartActividad';
import { ChartComerciales } from './ChartComerciales';
import { ChartLlamadasBase } from './ChartLlamadasBase';
import { ChartCasosLlamada } from './ChartCasosLlamada';
import { ChartGestionesCartera } from './ChartGestionesCartera';
import { ChartDescartesBuzon } from './ChartDescartesBuzon';

interface TabResumenProps {
    data: DashboardData;
}

export function TabResumenEjecutivo({ data }: TabResumenProps) {
    const { 
        periodo_actual: kpis, 
        tendencias, 
        por_dia, 
        por_comercial, 
        descartes_buzon,
        casos_contestadas,
        casos_no_contestadas
    } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                    titulo="Total Llamadas"
                    valor={kpis.llamadas_total.toLocaleString()}
                    icon={Phone}
                    colorScheme="blue"
                    tendencia={tendencias?.llamadas_total ?? null}
                />
                <KpiCard
                    titulo="Tasa Contestadas"
                    valor={kpis.pct_contestadas}
                    sufijo="%"
                    icon={CheckCircle2}
                    colorScheme="emerald"
                    tendencia={tendencias?.pct_contestadas ?? null}
                />
                <KpiCard
                    titulo="Leads Buzón"
                    valor={kpis.leads_buzon}
                    icon={MessageSquare}
                    colorScheme="violet"
                    tendencia={tendencias?.leads_buzon ?? null}
                />
                <KpiCard
                    titulo="Tasa Conversión"
                    valor={kpis.pct_conversion}
                    sufijo="%"
                    icon={Target}
                    colorScheme="amber"
                    tendencia={tendencias?.pct_conversion ?? null}
                />
                <KpiCard
                    titulo="Tiempo Respuesta"
                    valor={kpis.avg_tiempo_respuesta_min}
                    sufijo="min"
                    icon={Clock}
                    colorScheme="teal"
                    tendencia={tendencias?.avg_tiempo_respuesta_min ?? null}
                    invertirTendencia={true}
                />
            </div>

            {/* Actividad Diaria - Full Width */}
            <ChartActividad data={por_dia} />

            {/* Fila 2: Descartes Buzón y Llamadas Base - Mitad y Mitad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {descartes_buzon && (
                    <ChartDescartesBuzon data={descartes_buzon} />
                )}
                <ChartLlamadasBase
                    contestadas={kpis.llamadas_contestadas}
                    noContestadas={kpis.llamadas_total - kpis.llamadas_contestadas}
                />
            </div>

            {/* Fila 3: Distribución de Casos de Llamada - Mitad y Mitad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {casos_contestadas && (
                    <ChartCasosLlamada 
                        title="Distribución: Contestadas"
                        type="contestada"
                        data={casos_contestadas}
                    />
                )}
                {casos_no_contestadas && (
                    <ChartCasosLlamada 
                        title="Distribución: No Contestadas"
                        type="no_contestada"
                        data={casos_no_contestadas}
                    />
                )}
            </div>

            {/* Fila 4: Rendimiento por Comercial - Full Width */}
            {por_comercial.length > 0 && (
                <ChartComerciales data={por_comercial} />
            )}

            {/* Fila 5: Gestión de Cartera por Comercial - Full Width */}
            {por_comercial.length > 0 && (
                <ChartGestionesCartera data={por_comercial} />
            )}
        </div>
    );
}
