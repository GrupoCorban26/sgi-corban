'use client';

import React from 'react';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';

// ============================================
// BOTONES DE ACCIÓN (Editar, Eliminar, Crear)
// ============================================
interface ActionButtonsProps {
    onEdit?: () => void;
    onDelete?: () => void;
    onCreate?: () => void;
    createTitle?: string;
    editTitle?: string;
    deleteTitle?: string;
    createColor?: string;
    visible?: boolean;
}

export function ActionButtons({
    onEdit,
    onDelete,
    onCreate,
    createTitle = 'Crear',
    editTitle = 'Editar',
    deleteTitle = 'Desactivar',
    createColor = 'blue',
    visible = true
}: ActionButtonsProps) {
    const colorClasses: Record<string, string> = {
        blue: 'hover:bg-blue-100 hover:text-blue-600',
        purple: 'hover:bg-purple-100 hover:text-purple-600',
        indigo: 'hover:bg-indigo-100 hover:text-indigo-600',
    };

    return (
        <div className={`flex items-center justify-center gap-1 transition-all ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {onCreate && (
                <button
                    onClick={(e) => { e.stopPropagation(); onCreate(); }}
                    className={`p-1.5 text-slate-400 ${colorClasses[createColor]} rounded-lg transition-all`}
                    title={createTitle}
                >
                    <Plus size={15} />
                </button>
            )}
            {onEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 hover:bg-white hover:shadow-md text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                    title={editTitle}
                >
                    <Pencil size={15} />
                </button>
            )}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 hover:bg-white hover:shadow-md text-slate-400 hover:text-red-600 rounded-lg transition-all"
                    title={deleteTitle}
                >
                    <Trash2 size={15} />
                </button>
            )}
        </div>
    );
}

// ============================================
// ESTADO DE CARGA
// ============================================
interface LoadingRowProps {
    colSpan: number;
    message?: string;
    bgColor?: string;
    paddingLeft?: string;
}

export function LoadingRow({
    colSpan,
    message = 'Cargando...',
    bgColor = 'bg-slate-50/80',
    paddingLeft = 'pl-10'
}: LoadingRowProps) {
    return (
        <tr>
            <td colSpan={colSpan} className={`px-6 py-4 ${bgColor}`}>
                <div className={`flex items-center gap-2 text-slate-500 text-sm ${paddingLeft}`}>
                    <Loader2 size={16} className="animate-spin" />
                    {message}
                </div>
            </td>
        </tr>
    );
}

// ============================================
// ESTADO VACÍO
// ============================================
interface EmptyRowProps {
    colSpan: number;
    message: string;
    bgColor?: string;
    paddingLeft?: string;
}

export function EmptyRow({
    colSpan,
    message,
    bgColor = 'bg-slate-50/80',
    paddingLeft = 'pl-10'
}: EmptyRowProps) {
    return (
        <tr>
            <td colSpan={colSpan} className={`px-6 py-4 ${bgColor}`}>
                <div className={`text-slate-400 text-sm ${paddingLeft} italic`}>
                    {message}
                </div>
            </td>
        </tr>
    );
}

// ============================================
// ESTADO DE ERROR
// ============================================
interface ErrorRowProps {
    colSpan: number;
    message?: string;
    paddingLeft?: string;
}

export function ErrorRow({
    colSpan,
    message = 'Error al cargar',
    paddingLeft = 'pl-10'
}: ErrorRowProps) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-4 bg-red-50/50">
                <div className={`text-red-500 text-sm ${paddingLeft}`}>{message}</div>
            </td>
        </tr>
    );
}
