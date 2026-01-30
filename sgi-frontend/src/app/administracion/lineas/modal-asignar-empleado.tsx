'use client';

import React, { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { useLineas } from '@/hooks/organizacion/useLineas';
import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { Linea } from '@/types/organizacion/linea';

interface ModalAsignarEmpleadoProps {
    isOpen: boolean;
    onClose: () => void;
    linea: Linea | null;
}

export default function ModalAsignarEmpleado({ isOpen, onClose, linea }: ModalAsignarEmpleadoProps) {
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [observaciones, setObservaciones] = useState('');

    const { asignarEmpleadoMutation } = useLineas();
    const { data: empleados = [] } = useEmpleadosParaSelect();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linea || !empleadoId) return;

        try {
            await asignarEmpleadoMutation.mutateAsync({
                id: linea.id,
                data: {
                    empleado_id: empleadoId,
                    observaciones: observaciones || undefined
                }
            });
            toast.success('Línea asignada correctamente');
            onClose();
            setEmpleadoId(null);
            setObservaciones('');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al asignar la línea');
        }
    };

    if (!isOpen || !linea) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <UserPlus className="text-green-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Asignar Empleado</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Info */}
                <div className="p-4 bg-green-50 border-b border-green-100">
                    <p className="text-sm text-green-800">
                        <strong>Línea:</strong> {linea.numero} ({linea.gmail})
                    </p>
                    {linea.activo_id && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            <p className="font-medium">⚠️ Acción restringida</p>
                            <p className="mt-1">
                                Esta línea está vinculada a un dispositivo ({linea.activo_nombre}).
                                El responsable de la línea debe ser el mismo que el del dispositivo.
                            </p>
                            <p className="mt-1">
                                Para asignar esta línea, asigna el dispositivo correspondiente desde Inventario.
                            </p>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {!linea.activo_id ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
                                <select
                                    value={empleadoId ?? ''}
                                    onChange={(e) => setEmpleadoId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                                    required
                                >
                                    <option value="">Seleccionar empleado...</option>
                                    {empleados.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    rows={2}
                                    placeholder="Notas adicionales..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm resize-none"
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={asignarEmpleadoMutation.isPending || !empleadoId}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                                >
                                    {asignarEmpleadoMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                                    Asignar
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
