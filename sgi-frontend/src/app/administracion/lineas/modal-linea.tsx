'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useLineas } from '@/hooks/organizacion/useLineas';
// import { useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado'; // Removed unused
import { Linea, LineaCreate, LineaUpdate } from '@/types/organizacion/linea';

interface ModalLineaProps {
    isOpen: boolean;
    onClose: () => void;
    linea: Linea | null;
}

export default function ModalLinea({ isOpen, onClose, linea }: ModalLineaProps) {
    const { createMutation, updateMutation } = useLineas();
    const isEditing = !!linea;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<LineaCreate>();

    useEffect(() => {
        if (isOpen) {
            if (linea) {
                reset({
                    numero: linea.numero,
                    gmail: linea.gmail,
                    operador: linea.operador || '',
                    plan: linea.plan || '',
                    proveedor: linea.proveedor || '',
                    observaciones: linea.observaciones || '',
                });
            } else {
                reset({
                    numero: '',
                    gmail: '',
                    operador: '',
                    plan: '',
                    proveedor: '',
                    observaciones: '',
                });
            }
        }
    }, [isOpen, linea, reset]);

    const onSubmit = async (data: LineaCreate) => {
        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id: linea!.id,
                    data: data as LineaUpdate
                });
                toast.success('Línea actualizada correctamente');
            } else {
                await createMutation.mutateAsync(data);
                toast.success('Línea creada correctamente');
            }
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al guardar la línea');
        }
    };

    if (!isOpen) return null;

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Editar Línea' : 'Nueva Línea Corporativa'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                            <input
                                type="text"
                                {...register('numero', { required: 'El número es requerido' })}
                                placeholder="987654321"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            />
                            {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operador</label>
                            <select
                                {...register('operador')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Claro">Claro</option>
                                <option value="Movistar">Movistar</option>
                                <option value="Entel">Entel</option>
                                <option value="Bitel">Bitel</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gmail Configurado *</label>
                        <input
                            type="email"
                            {...register('gmail', { required: 'El gmail es requerido' })}
                            placeholder="grupocorban01@gmail.com"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                        {errors.gmail && <p className="text-red-500 text-xs mt-1">{errors.gmail.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                        <input
                            type="text"
                            {...register('plan')}
                            placeholder="Ej: Ilimitado 50GB"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                        <select
                            {...register('proveedor')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Corban Trans Logistic S.A.C.">Corban Trans Logistic S.A.C.</option>
                            <option value="Corban Agencia de Aduanas S.A.C.">Corban Agencia de Aduanas S.A.C.</option>
                            <option value="EBL Grupo Logistico S.A.C.">EBL Grupo Logistico S.A.C.</option>
                        </select>
                    </div>

                    {!isEditing && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">Asignación de Dispositivo</h4>
                            <p className="text-xs text-blue-700">
                                Para instalar esta línea en un equipo, créela primero y luego use la opción "Cambiar Dispositivo".
                                <br />
                                <strong>Nota:</strong> Al instalarla en un equipo, tomará automáticamente el empleado responsable de dicho equipo.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                        <textarea
                            {...register('observaciones')}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm resize-none"
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
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            {isEditing ? 'Guardar Cambios' : 'Crear Línea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
