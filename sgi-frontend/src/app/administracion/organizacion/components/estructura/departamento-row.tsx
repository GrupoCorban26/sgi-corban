'use client';

import React from 'react';
import { Building2, User, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from 'lucide-react';
import { Departamento } from '@/types/organizacion/departamento';

// ============================================
// TIPOS
// ============================================
interface DepartamentoRowProps {
    depto: Departamento;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCreateArea?: () => void;
}

// ============================================
// COMPONENTE: Fila de Departamento (Nivel 1)
// ============================================
export function DepartamentoRow({
    depto,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
    onCreateArea
}: DepartamentoRowProps) {
    return (
        <tr
            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onToggle();
            }}
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    {/* Flecha de expansión */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">{depto.nombre}</div>
                        <div className="text-[11px] text-slate-400 font-medium">ID: {depto.id}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-white shadow-sm">
                        <User size={14} />
                    </div>
                    <span className="text-sm text-slate-700 font-semibold">
                        {depto.responsable_nombre || 'Sin asignar'}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {/* Botón crear área */}
                    {onCreateArea && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCreateArea(); }}
                            className="p-2 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                            title="Crear área en este departamento"
                        >
                            <Plus size={17} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 hover:bg-white hover:shadow-md text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                        title="Editar departamento"
                    >
                        <Pencil size={17} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 hover:bg-white hover:shadow-md text-slate-400 hover:text-red-600 rounded-lg transition-all"
                        title="Desactivar departamento"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
