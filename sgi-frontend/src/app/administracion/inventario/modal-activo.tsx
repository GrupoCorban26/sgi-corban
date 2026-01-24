'use client';

import React, { useEffect, useState } from 'react';
import { Save, Package, Loader2, AlertCircle } from 'lucide-react';
import { Activo, ActivoCreate, ActivoUpdate } from '@/types/organizacion/activo';
import { useActivos } from '@/hooks/organizacion/useActivo';
import { useEstadosActivo } from '@/hooks/organizacion/useEstadoActivo';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
import { toast } from 'sonner';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    activoData?: Activo | null;
}

interface FormState {
    producto: string;
    marca: string;
    modelo: string;
    serie: string;
    codigo_inventario: string;
    estado_id: number;
    observaciones: string;
}

const initialFormState: FormState = {
    producto: '',
    marca: '',
    modelo: '',
    serie: '',
    codigo_inventario: '',
    estado_id: 0,
    observaciones: '',
};

function ModalActivoContent({ activoData, isOpen }: { activoData?: Activo | null; isOpen: boolean }) {
    const { handleClose } = useModalContext();
    const isEdit = !!activoData;
    const [formData, setFormData] = useState<FormState>(initialFormState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { estados, isLoading: isLoadingEstados } = useEstadosActivo();

    const { createMutation, updateMutation } = useActivos();
    const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
        if (isEdit && activoData) {
            setFormData({
                producto: activoData.producto || '',
                marca: activoData.marca || '',
                modelo: activoData.modelo || '',
                serie: activoData.serie || '',
                codigo_inventario: activoData.codigo_inventario || '',
                estado_id: activoData.estado_id || 0,
                observaciones: activoData.observaciones || '',
            });
        } else {
            setFormData(initialFormState);
        }
        setErrors({});
    }, [isEdit, activoData, isOpen]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.producto.trim()) newErrors.producto = 'El producto es obligatorio';
        if (!isEdit && !formData.estado_id) newErrors.estado_id = 'El estado es obligatorio';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error('Por favor corrija los errores');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit && activoData) {
                const updateData: ActivoUpdate = {
                    producto: formData.producto,
                    marca: formData.marca || undefined,
                    modelo: formData.modelo || undefined,
                    serie: formData.serie || undefined,
                    codigo_inventario: formData.codigo_inventario || undefined,
                    observaciones: formData.observaciones || undefined,
                };
                await updateMutation.mutateAsync({ id: activoData.id, data: updateData });
                toast.success('Activo actualizado correctamente');
            } else {
                const createData: ActivoCreate = {
                    producto: formData.producto,
                    marca: formData.marca || undefined,
                    modelo: formData.modelo || undefined,
                    serie: formData.serie || undefined,
                    codigo_inventario: formData.codigo_inventario || undefined,
                    estado_id: Number(formData.estado_id),
                    observaciones: formData.observaciones || undefined,
                };
                await createMutation.mutateAsync(createData);
                toast.success('Activo registrado correctamente');
            }
            handleClose();
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al guardar');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <ModalHeader
                icon={<Package size={20} className={isEdit ? "text-amber-600" : "text-blue-600"} />}
                title={isEdit ? 'Editar Activo' : 'Registrar Nuevo Activo'}
            />

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-sm text-red-700">{Object.values(errors)[0]}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Producto <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="producto"
                            value={formData.producto}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-sm ${errors.producto ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                            placeholder="Ej: Laptop, Audífonos, Monitor..."
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Marca</label>
                        <input
                            type="text"
                            name="marca"
                            value={formData.marca}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Ej: HP, Logitech, Dell..."
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Modelo</label>
                        <input
                            type="text"
                            name="modelo"
                            value={formData.modelo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Ej: ProBook 450, G502, P2419H..."
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Número de Serie</label>
                        <input
                            type="text"
                            name="serie"
                            value={formData.serie}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Número de serie del equipo"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Código de Inventario</label>
                        <input
                            type="text"
                            name="codigo_inventario"
                            value={formData.codigo_inventario}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Ej: INV-001"
                            disabled={isLoading}
                        />
                    </div>

                    {!isEdit && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Estado Físico <span className="text-red-500">*</span></label>
                            <select
                                name="estado_id"
                                value={formData.estado_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                disabled={isLoading || isLoadingEstados}
                            >
                                <option value={0}>Seleccione un estado</option>
                                {estados.map(estado => (
                                    <option key={estado.id} value={estado.id}>{estado.nombre.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Observaciones</label>
                    <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        placeholder="Observaciones adicionales..."
                        disabled={isLoading}
                    />
                </div>
            </form>

            <ModalFooter>
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="cursor-pointer flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white hover:border-gray-400 disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`cursor-pointer flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${isEdit ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                >
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEdit ? 'Guardar Cambios' : 'Registrar'}</>}
                </button>
            </ModalFooter>
        </>
    );
}

export default function ModalActivo({ isOpen, onClose, activoData }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <ModalActivoContent activoData={activoData} isOpen={isOpen} />
        </ModalBase>
    );
}
