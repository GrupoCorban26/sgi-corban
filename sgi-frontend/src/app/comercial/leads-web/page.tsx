'use client';

import React, { useState } from 'react';
import { Globe, Inbox, Filter, RefreshCw } from 'lucide-react';
import { useLeadsWeb } from '@/hooks/comercial/useLeadsWeb';
import { LeadWeb, LeadWebFiltros, EstadoLeadWeb } from '@/types/lead-web';
import LeadWebTabla from './components/LeadWebTabla';
import LeadWebDetalle from './components/LeadWebDetalle';

const ESTADOS_FILTRO: { value: EstadoLeadWeb | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'NUEVO', label: 'Nuevos' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'EN_GESTION', label: 'En Gestión' },
    { value: 'CONVERTIDO', label: 'Convertidos' },
    { value: 'DESCARTADO', label: 'Descartados' },
];

const PAGINAS_FILTRO = [
    { value: '', label: 'Todas las páginas' },
    { value: 'grupocorban.pe', label: 'Grupo Corban' },
    { value: 'corbantranslogistic.com', label: 'Corban Trans Logistic' },
    { value: 'corbanaduanas.pe', label: 'Corban Aduanas' },
    { value: 'eblgroup.pe', label: 'EBL Group' },
];

export default function LeadsWebPage() {
    const [filtros, setFiltros] = useState<LeadWebFiltros>({});
    const [selectedLead, setSelectedLead] = useState<LeadWeb | null>(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    const {
        leads,
        isLoading,
        refetch,
        pendientes,
        cambiarEstadoMutation,
        descartarMutation,
        convertirMutation,
        actualizarNotasMutation,
        asignarManualMutation,
    } = useLeadsWeb(filtros);

    const handleFiltroChange = (key: keyof LeadWebFiltros, value: string | number) => {
        setFiltros(prev => ({ ...prev, [key]: value || undefined }));
    };

    const conteoActivos = leads.filter(l =>
        ['NUEVO', 'PENDIENTE', 'EN_GESTION'].includes(l.estado)
    ).length;

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Panel principal */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${selectedLead ? 'lg:mr-[420px]' : ''}`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                                <Globe className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">Leads Web</h1>
                                <p className="text-sm text-slate-400">
                                    Formularios de contacto de las páginas web
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {conteoActivos > 0 && (
                                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                                    {conteoActivos} activos
                                </span>
                            )}
                            <button
                                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                                className={`p-2.5 rounded-xl border transition-all ${mostrarFiltros
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <Filter size={18} />
                            </button>
                            <button
                                onClick={() => refetch()}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 bg-white transition-all"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Filtros */}
                    {mostrarFiltros && (
                        <div className="flex gap-3 pt-3 border-t border-slate-100">
                            <select
                                value={filtros.estado || ''}
                                onChange={(e) => handleFiltroChange('estado', e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium
                                    focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer"
                            >
                                {ESTADOS_FILTRO.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                            <select
                                value={filtros.pagina_origen || ''}
                                onChange={(e) => handleFiltroChange('pagina_origen', e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium
                                    focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer"
                            >
                                {PAGINAS_FILTRO.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-auto bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Inbox size={48} className="mb-3 text-slate-300" />
                            <p className="text-lg font-medium">No hay leads web</p>
                            <p className="text-sm mt-1">Los leads de formularios web aparecerán aquí</p>
                        </div>
                    ) : (
                        <LeadWebTabla
                            leads={leads}
                            selectedId={selectedLead?.id}
                            onSelect={setSelectedLead}
                        />
                    )}
                </div>
            </div>

            {/* Panel lateral de detalle */}
            {selectedLead && (
                <div className="fixed right-0 top-16 bottom-0 w-[420px] border-l border-slate-200 bg-white shadow-xl z-10 overflow-y-auto">
                    <LeadWebDetalle
                        lead={selectedLead}
                        onClose={() => setSelectedLead(null)}
                        onEstadoCambiado={(nuevoEstado) => {
                            setSelectedLead({ ...selectedLead, estado: nuevoEstado as EstadoLeadWeb });
                        }}
                        cambiarEstadoMutation={cambiarEstadoMutation}
                        descartarMutation={descartarMutation}
                        convertirMutation={convertirMutation}
                        actualizarNotasMutation={actualizarNotasMutation}
                    />
                </div>
            )}
        </div>
    );
}
