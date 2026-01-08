'use client';

import React from 'react';
import { GitBranch, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAreasByDepartamento } from '@/hooks/organizacion/useArea';
import { Area } from '@/types/organizacion/area';
import { Cargo } from '@/types/organizacion/cargo';
import { ActionButtons, LoadingRow, EmptyRow, ErrorRow } from '../ui/table-helpers';
import { CargosExpandidos } from './cargos-expandidos';

// ============================================
// TIPOS
// ============================================
interface AreasExpandidasProps {
    deptoId: number;
    onEditArea?: (area: Area) => void;
    onDeleteArea?: (area: Area) => void;
    onEditCargo?: (cargo: Cargo) => void;
    onDeleteCargo?: (cargo: Cargo) => void;
    onCreateCargo?: (areaId: number) => void;
    expandedAreas: Set<number>;
    onToggleArea: (areaId: number) => void;
}

// ============================================
// COMPONENTE: Áreas Expandidas (Nivel 2)
// ============================================
export function AreasExpandidas({
    deptoId,
    onEditArea,
    onDeleteArea,
    onEditCargo,
    onDeleteCargo,
    onCreateCargo,
    expandedAreas,
    onToggleArea
}: AreasExpandidasProps) {
    const { data: areas = [], isLoading, isError } = useAreasByDepartamento(deptoId);

    if (isLoading) {
        return <LoadingRow colSpan={3} message="Cargando áreas..." />;
    }

    if (isError) {
        return <ErrorRow colSpan={3} message="Error al cargar áreas" />;
    }

    if (areas.length === 0) {
        return <EmptyRow colSpan={3} message="No hay áreas registradas en este departamento" />;
    }

    return (
        <>
            {areas.map((area) => {
                const isExpanded = expandedAreas.has(area.id);
                return (
                    <React.Fragment key={`area-${area.id}`}>
                        {/* Fila del Área */}
                        <tr
                            className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors group cursor-pointer"
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                onToggleArea(area.id);
                            }}
                        >
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-3 pl-8">
                                    {/* Flecha de expansión */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleArea(area.id); }}
                                        className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
                                        <GitBranch size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">{area.nombre}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                        <User size={12} />
                                    </div>
                                    <span className="text-sm text-slate-600">
                                        {area.responsable_nombre || 'Sin asignar'}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                                <ActionButtons
                                    onCreate={onCreateCargo ? () => onCreateCargo(area.id) : undefined}
                                    onEdit={onEditArea ? () => onEditArea(area) : undefined}
                                    onDelete={onDeleteArea ? () => onDeleteArea(area) : undefined}
                                    createTitle="Crear cargo en esta área"
                                    createColor="purple"
                                    editTitle="Editar área"
                                    deleteTitle="Desactivar área"
                                    visible
                                />
                            </td>
                        </tr>
                        {/* Cargos expandidos */}
                        {isExpanded && (
                            <CargosExpandidos
                                areaId={area.id}
                                onEdit={onEditCargo}
                                onDelete={onDeleteCargo}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
}
