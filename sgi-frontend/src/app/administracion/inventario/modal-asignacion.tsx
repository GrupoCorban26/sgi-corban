'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Activo, AsignacionActivoRequest } from '@/types/organizacion/activo';
import { useActivos } from '@/hooks/organizacion/useActivo';
import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    activoData: Activo | null;
}

function ModalAsignacionContent({ activoData }: { activoData: Activo }) {
    const { handleClose } = useModalContext();
    const [empleadoId, setEmpleadoId] = useState<string>('');
    const [observaciones, setObservaciones] = useState('');
    const [error, setError] = useState('');

    const { asignarMutation } = useActivos();
    const { data: empleados = [], isLoading: isLoadingEmpleados } = useEmpleadosParaSelect();

    const isSubmitting = asignarMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empleadoId) {
            setError('Debe seleccionar un empleado');
            return;
        }

        try {
            const data: AsignacionActivoRequest = {
                empleado_id: parseInt(empleadoId),
                observaciones: observaciones.trim() || undefined
            };

            await asignarMutation.mutateAsync({ id: activoData.id, data });
            toast.success('Activo asignado correctamenete');
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al asignar activo');
        }
    };

    return (
        <>
            <ModalHeader
                icon={<UserPlus size={20} className="text-indigo-600" />}
                title="Asignar Activo a Empleado"
            />

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Info del Activo */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-indigo-600">
                        <Package size={20} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{activoData.producto}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                            <span>{activoData.marca} {activoData.modelo}</span>
                            {activoData.serie && <span className="bg-gray-200 px-1.5 rounded text-gray-700 font-mono">{activoData.serie}</span>}
                            <span className={`px-1.5 rounded font-medium ${activoData.estado_fisico === 'BUENO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {activoData.estado_fisico}
                            </span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Empleado <span className="text-red-500">*</span></label>
                    <select
                        value={empleadoId}
                        onChange={(e) => { setEmpleadoId(e.target.value); setError(''); }}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                        disabled={isSubmitting || isLoadingEmpleados}
                    >
                        <option value="">Seleccione un empleado...</option>
                        {empleados.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.nombre_completo}
                            </option>
                        ))}
                    </select>
                    {isLoadingEmpleados && <p className="text-xs text-gray-400 mt-1">Cargando empleados...</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Observaciones de Entrega</label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none transition-all"
                        placeholder="Estado visual, accesorios incluidos, notas..."
                        disabled={isSubmitting}
                    />
                </div>
            </form>

            <ModalFooter>
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !empleadoId}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Confirmar Asignación
                </button>
            </ModalFooter>
        </>
    );
}

export default function ModalAsignacion({ isOpen, onClose, activoData }: ModalProps) {
    if (!activoData) return null;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <ModalAsignacionContent activoData={activoData} />
        </ModalBase>
    );
}
