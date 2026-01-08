'use client';

import React, { useState } from 'react';
import { RefreshCw, Search, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDepartamentos } from '@/hooks/organizacion/useDepartamento';
import { Departamento } from '@/types/organizacion/departamento';
import { Area } from '@/types/organizacion/area';
import { Cargo } from '@/types/organizacion/cargo';
import { DepartamentoRow } from './departamento-row';
import { AreasExpandidas } from './areas-expandidas';

// ============================================
// TIPOS
// ============================================
interface EstructuraTabProps {
    onEdit: (depto: Departamento) => void;
    onDelete: (depto: Departamento) => void;
    onEditArea?: (area: Area) => void;
    onDeleteArea?: (area: Area) => void;
    onEditCargo?: (cargo: Cargo) => void;
    onDeleteCargo?: (cargo: Cargo) => void;
    onCreateArea?: (departamentoId: number) => void;
    onCreateCargo?: (areaId: number) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function EstructuraTab({
    onEdit,
    onDelete,
    onEditArea,
    onDeleteArea,
    onEditCargo,
    onDeleteCargo,
    onCreateArea,
    onCreateCargo
}: EstructuraTabProps) {
    // Estados locales
    const [busqueda, setBusqueda] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [expandedDeptos, setExpandedDeptos] = useState<Set<number>>(new Set());
    const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

    // Query
    const { departamentos, totalPages, totalRegistros, isLoading, isError, error, refetch, isFetching } = useDepartamentos(busqueda, page, pageSize);

    // Toggles
    const toggleExpandDepto = (deptoId: number) => {
        setExpandedDeptos(prev => {
            const newSet = new Set(prev);
            newSet.has(deptoId) ? newSet.delete(deptoId) : newSet.add(deptoId);
            return newSet;
        });
    };

    const toggleExpandArea = (areaId: number) => {
        setExpandedAreas(prev => {
            const newSet = new Set(prev);
            newSet.has(areaId) ? newSet.delete(areaId) : newSet.add(areaId);
            return newSet;
        });
    };

    return (
        <div className="flex flex-col h-full min-h-125 bg-white">
            {/* Barra de herramientas */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                        placeholder="Buscar por nombre..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    title="Refrescar datos"
                >
                    <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Tabla */}
            <div className="grow overflow-x-auto">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle size={40} className="mb-2" />
                        <p className="font-medium">{(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al cargar"}</p>
                        <button onClick={() => refetch()} className="mt-4 text-sm underline text-slate-600">Reintentar</button>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b">
                                <th className="px-6 py-4 font-semibold">Estructura</th>
                                <th className="px-6 py-4 font-semibold">Responsable</th>
                                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={3} className="px-6 py-6 bg-slate-50/30"></td>
                                    </tr>
                                ))
                            ) : departamentos.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center text-slate-400 text-sm">
                                        No se encontraron departamentos.
                                    </td>
                                </tr>
                            ) : departamentos.map((depto) => {
                                const isExpanded = expandedDeptos.has(depto.id);
                                return (
                                    <React.Fragment key={depto.id}>
                                        <DepartamentoRow
                                            depto={depto}
                                            isExpanded={isExpanded}
                                            onToggle={() => toggleExpandDepto(depto.id)}
                                            onEdit={() => onEdit(depto)}
                                            onDelete={() => onDelete(depto)}
                                            onCreateArea={onCreateArea ? () => onCreateArea(depto.id) : undefined}
                                        />
                                        {isExpanded && (
                                            <AreasExpandidas
                                                deptoId={depto.id}
                                                onEditArea={onEditArea}
                                                onDeleteArea={onDeleteArea}
                                                onEditCargo={onEditCargo}
                                                onDeleteCargo={onDeleteCargo}
                                                onCreateCargo={onCreateCargo}
                                                expandedAreas={expandedAreas}
                                                onToggleArea={toggleExpandArea}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paginación */}
            <div className="p-4 border-t flex items-center justify-between bg-slate-50/50">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
                    Total: <span className="text-slate-900 font-bold">{totalRegistros}</span>
                </p>
                <div className="flex items-center gap-3">
                    <button
                        disabled={page === 1 || isLoading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50"
                    >
                        <ChevronLeft size={14} /> Anterior
                    </button>
                    <div className="flex items-center gap-1.5">
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md">
                            {page}
                        </span>
                        <span className="text-xs text-slate-400 font-medium px-1">de {totalPages}</span>
                    </div>
                    <button
                        disabled={page >= totalPages || isLoading}
                        onClick={() => setPage(p => p + 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50"
                    >
                        Siguiente <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
