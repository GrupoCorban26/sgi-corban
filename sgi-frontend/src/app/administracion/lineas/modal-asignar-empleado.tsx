'use client';

import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

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
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err?.response?.data?.detail || 'Error al asignar la línea');
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                icon={<UserPlus size={20} className="text-green-600" />}
                title="Asignar Empleado"
            />

            {/* Info */}
            {linea && (
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
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {linea && !linea.activo_id ? (
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

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={asignarEmpleadoMutation.isPending || !empleadoId}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-semibold shadow-lg shadow-green-200"
                            >
                                {asignarEmpleadoMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                                Asignar
                            </button>
                        </ModalFooter>
                    </>
                ) : (
                    <ModalFooter>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cerrar
                        </button>
                    </ModalFooter>
                )}
            </form>
        </ModalBase>
    );
}
