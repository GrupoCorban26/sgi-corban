'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    BarChart3,
    Phone,
    MessageSquare,
    Bot,
    Download,
    ArrowLeftRight,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import { useDashboard } from '@/hooks/comercial/useDashboard';

import { TabResumenEjecutivo } from './components/TabResumenEjecutivo';
import { SectionBaseDatos } from './components/SectionBaseDatos';
import { SectionCartera } from './components/SectionCartera';
import { SectionBuzon } from './components/SectionBuzon';

type TabId = 'resumen' | 'llamadas' | 'buzon' | 'bot';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: Tab[] = [
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3 },
    { id: 'llamadas', label: 'Llamadas', icon: Phone },
    { id: 'buzon', label: 'Buzón WhatsApp', icon: MessageSquare },
    { id: 'bot', label: 'Bot Analytics', icon: Bot },
];

export default function ReportesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('resumen');
    const [fechaInicio, setFechaInicio] = useState(
        format(startOfMonth(new Date()), 'yyyy-MM-dd')
    );
    const [fechaFin, setFechaFin] = useState(
        format(endOfMonth(new Date()), 'yyyy-MM-dd')
    );
    const [comparar, setComparar] = useState(false);
    const [comercialId, setComercialId] = useState<string | undefined>();
    const [empresa, setEmpresa] = useState<string | undefined>();

    // RBAC: roles del usuario
    const [roles, setRoles] = useState<string[]>([]);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
                try {
                    const user = JSON.parse(userDataStr);
                    setRoles(user.roles || []);
                } catch { /* empty */ }
            }
        }
    }, []);

    const isSistemasOrAdmin =
        roles.includes('SISTEMAS') ||
        roles.includes('ADMIN') ||
        roles.includes('GERENCIA') ||
        roles.includes('ADMINISTRADOR');
    const isJefeComercial = roles.includes('JEFE_COMERCIAL');

    const { data: comerciales = [] } = useComerciales();

    // Dashboard data (solo para tab resumen)
    const {
        data: dashboardData,
        isLoading: dashLoading,
        isError: dashError,
        isFetching: dashFetching,
    } = useDashboard({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        comparar,
        comercial_id: comercialId ? parseInt(comercialId) : undefined,
        empresa,
    });

    return (
        <div className="space-y-5">
            {/* ============================================= */}
            {/* HEADER GLOBAL */}
            {/* ============================================= */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Título + Filtros */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Centro de Reportes
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Métricas de rendimiento comercial
                            </p>
                        </div>

                        {/* Filtros Globales */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Rango de Fechas */}
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none cursor-pointer"
                                />
                                <span className="text-gray-300 font-bold">→</span>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none cursor-pointer"
                                />
                            </div>

                            {/* Toggle Comparación */}
                            <button
                                onClick={() => setComparar(!comparar)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                    comparar
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                <ArrowLeftRight size={14} />
                                vs Anterior
                            </button>

                            {/* Filtro Comercial */}
                            {(isSistemasOrAdmin || isJefeComercial) && (
                                <select
                                    value={comercialId || ''}
                                    onChange={(e) => setComercialId(e.target.value || undefined)}
                                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="">Todos los comerciales</option>
                                    {comerciales.map((c) => (
                                        <option key={c.id} value={c.id.toString()}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Filtro Empresa */}
                            {isSistemasOrAdmin && (
                                <select
                                    value={empresa || ''}
                                    onChange={(e) => setEmpresa(e.target.value || undefined)}
                                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="">Todas las empresas</option>
                                    <option value="EBL">EBL</option>
                                    <option value="CORBAN">CORBAN</option>
                                    <option value="TRANS CARGO">TRANS CARGO</option>
                                    <option value="TRANS LOGISTIC">TRANS LOGISTIC</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 flex gap-1 overflow-x-auto bg-gray-50/50 pt-2">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 border-b-2 whitespace-nowrap ${
                                    isActive
                                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <TabIcon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                    {dashFetching && (
                        <div className="flex items-center px-3">
                            <Loader2 size={16} className="animate-spin text-blue-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================= */}
            {/* CONTENIDO DEL TAB */}
            {/* ============================================= */}
            <div className="pb-6">
                {activeTab === 'resumen' && (
                    <>
                        {dashError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-red-500">
                                <AlertCircle size={48} className="mb-4 opacity-50" />
                                <p className="font-medium text-lg">Error al cargar el dashboard</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Verifica la conexión con el servidor.
                                </p>
                            </div>
                        ) : dashLoading || !dashboardData ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 size={40} className="animate-spin text-blue-400 mb-4" />
                                <p className="text-gray-400 font-medium">Cargando métricas...</p>
                            </div>
                        ) : (
                            <TabResumenEjecutivo data={dashboardData} />
                        )}
                    </>
                )}

                {activeTab === 'llamadas' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <SectionBaseDatos />
                        <SectionCartera />
                    </div>
                )}

                {activeTab === 'buzon' && (
                    <div className="animate-in fade-in duration-300">
                        <SectionBuzon />
                    </div>
                )}

                {activeTab === 'bot' && (
                    <div className="animate-in fade-in duration-300">
                        <p className="text-center text-gray-400 py-12">Próximamente</p>
                    </div>
                )}
            </div>
        </div>
    );
}
