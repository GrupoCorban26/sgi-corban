'use client';

import React from 'react';
import { Briefcase } from 'lucide-react';
import { useCargosByArea } from '@/hooks/organizacion/useCargo';
import { Cargo } from '@/types/organizacion/cargo';
import { ActionButtons, LoadingRow, EmptyRow, ErrorRow } from '@/components/ui/TableHelpers';

// ============================================
// TIPOS
// ============================================
interface CargosExpandidosProps {
    areaId: number;
    onEdit?: (cargo: Cargo) => void;
    onDelete?: (cargo: Cargo) => void;
}

// ============================================
// COMPONENTE: Cargos Expandidos (Nivel 3)
// ============================================
export function CargosExpandidos({ areaId, onEdit, onDelete }: CargosExpandidosProps) {
    const { data: cargos = [], isLoading, isError } = useCargosByArea(areaId);

    if (isLoading) {
        return <LoadingRow colSpan={3} message="Cargando cargos..." bgColor="bg-purple-50/30" paddingLeft="pl-20" />;
    }

    if (isError) {
        return <ErrorRow colSpan={3} message="Error al cargar cargos" paddingLeft="pl-20" />;
    }

    if (cargos.length === 0) {
        return <EmptyRow colSpan={3} message="No hay cargos registrados en esta área" bgColor="bg-purple-50/30" paddingLeft="pl-20" />;
    }

    return (
        <>
            {cargos.map((cargo) => (
                <tr key={`cargo-${cargo.id}`} className="bg-purple-50/30 hover:bg-purple-100/40 transition-colors group">
                    <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3 pl-16">
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-px h-full bg-purple-200"></div>
                            </div>
                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                <Briefcase size={14} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-700">{cargo.nombre}</div>
                                {cargo.descripcion && (
                                    <div className="text-[10px] text-slate-400">{cargo.descripcion}</div>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-2.5">
                        <span className="text-xs text-slate-400">—</span>
                    </td>
                    <td className="px-6 py-2.5 text-center">
                        <ActionButtons
                            onEdit={onEdit ? () => onEdit(cargo) : undefined}
                            onDelete={onDelete ? () => onDelete(cargo) : undefined}
                            editTitle="Editar cargo"
                            deleteTitle="Desactivar cargo"
                            visible
                        />
                    </td>
                </tr>
            ))}
        </>
    );
}
