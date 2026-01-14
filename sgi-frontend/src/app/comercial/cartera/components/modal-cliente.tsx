'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Building2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useClientes } from '@/hooks/useClientes';
import { Cliente, ClienteCreate, ClienteUpdate } from '@/types/cliente';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';

// ============================================
// TIPOS
// ============================================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    clienteToEdit?: Cliente | null;
}

interface ModalContentProps {
    clienteToEdit: Cliente | null;
    isOpen: boolean;
}

interface FormErrors {
    razon_social?: string;
    ruc?: string;
    ultimo_contacto?: string;
    proxima_fecha_contacto?: string;
    comentario?: string;
}

// ============================================
// COMPONENTE INTERNO
// ============================================
function ModalContent({ clienteToEdit, isOpen }: ModalContentProps) {
    const { handleClose } = useModalContext();
    const isEditMode = !!clienteToEdit;

    // Mutations
    const { createMutation, updateMutation } = useClientes();

    // Form state
    const [ruc, setRuc] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [nombreComercial, setNombreComercial] = useState('');
    const [direccionFiscal, setDireccionFiscal] = useState('');
    const [tipoEstado, setTipoEstado] = useState('PROSPECTO');
    const [ultimoContacto, setUltimoContacto] = useState('');
    const [comentario, setComentario] = useState('');
    const [proximaFecha, setProximaFecha] = useState('');

    // Validation state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // Derived
    const isLoading = createMutation.isPending || updateMutation.isPending;
    const config = useMemo(() => ({
        title: isEditMode ? 'Editar Cliente' : 'Nuevo Cliente',
        icon: <Building2 size={20} className="text-indigo-600" />,
        successMessage: isEditMode ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente',
    }), [isEditMode]);

    // Reset form when modal opens
    useEffect(() => {
        if (!isOpen) return;

        if (clienteToEdit) {
            setRuc(clienteToEdit.ruc || '');
            setRazonSocial(clienteToEdit.razon_social || '');
            setNombreComercial(clienteToEdit.nombre_comercial || '');
            setDireccionFiscal(clienteToEdit.direccion_fiscal || '');
            setTipoEstado(clienteToEdit.tipo_estado || 'PROSPECTO');
            setUltimoContacto(clienteToEdit.ultimo_contacto || '');
            setComentario(clienteToEdit.comentario_ultima_llamada || '');
            setProximaFecha(clienteToEdit.proxima_fecha_contacto || '');
        } else {
            setRuc('');
            setRazonSocial('');
            setNombreComercial('');
            setDireccionFiscal('');
            setTipoEstado('PROSPECTO');
            setUltimoContacto('');
            setComentario('');
            setProximaFecha('');
        }
        setErrors({});
        setTouched(new Set());
    }, [isOpen, clienteToEdit]);

    // Validate field
    const validateField = (field: string, value: string): string | undefined => {
        switch (field) {
            case 'razon_social':
                if (!value.trim()) return 'La razón social es requerida';
                if (value.trim().length < 3) return 'Mínimo 3 caracteres';
                break;
            case 'ruc':
                if (value && value.length !== 11) return 'El RUC debe tener 11 dígitos';
                if (value && !/^\d+$/.test(value)) return 'El RUC solo puede contener números';
                break;
            case 'ultimo_contacto':
                if (!value) return 'La fecha de último contacto es requerida';
                break;
            case 'proxima_fecha_contacto':
                if (!value) return 'La fecha de próximo contacto es requerida';
                break;
            case 'comentario':
                if (!value.trim()) return 'El comentario es requerido';
                if (value.trim().length < 5) return 'Mínimo 5 caracteres';
                break;
        }
        return undefined;
    };

    // Validate form
    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        const razonError = validateField('razon_social', razonSocial);
        if (razonError) newErrors.razon_social = razonError;

        const rucError = validateField('ruc', ruc);
        if (rucError) newErrors.ruc = rucError;

        const ultimoContactoError = validateField('ultimo_contacto', ultimoContacto);
        if (ultimoContactoError) newErrors.ultimo_contacto = ultimoContactoError;

        const proximaFechaError = validateField('proxima_fecha_contacto', proximaFecha);
        if (proximaFechaError) newErrors.proxima_fecha_contacto = proximaFechaError;

        const comentarioError = validateField('comentario', comentario);
        if (comentarioError) newErrors.comentario = comentarioError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [razonSocial, ruc, ultimoContacto, proximaFecha, comentario]);

    // Handle blur
    const handleBlur = (field: string, value: string) => {
        setTouched(prev => new Set(prev).add(field));
        const error = validateField(field, value);
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) newErrors[field as keyof FormErrors] = error;
            else delete newErrors[field as keyof FormErrors];
            return newErrors;
        });
    };

    // Submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(new Set(['razon_social', 'ruc', 'ultimo_contacto', 'proxima_fecha_contacto', 'comentario']));

        if (!validateForm()) {
            toast.error('Por favor corrija los errores en el formulario');
            return;
        }

        try {
            if (isEditMode && clienteToEdit) {
                const updateData: ClienteUpdate = {
                    ruc: ruc || null,
                    razon_social: razonSocial.trim(),
                    nombre_comercial: nombreComercial.trim() || null,
                    direccion_fiscal: direccionFiscal.trim() || null,
                    tipo_estado: tipoEstado,
                    ultimo_contacto: ultimoContacto,
                    comentario_ultima_llamada: comentario.trim(),
                    proxima_fecha_contacto: proximaFecha,
                };
                await updateMutation.mutateAsync({ id: clienteToEdit.id, data: updateData });
            } else {
                const createData: ClienteCreate = {
                    ruc: ruc || null,
                    razon_social: razonSocial.trim(),
                    nombre_comercial: nombreComercial.trim() || null,
                    direccion_fiscal: direccionFiscal.trim() || null,
                    tipo_estado: tipoEstado,
                    ultimo_contacto: ultimoContacto,
                    comentario_ultima_llamada: comentario.trim(),
                    proxima_fecha_contacto: proximaFecha,
                };
                await createMutation.mutateAsync(createData);
            }
            toast.success(config.successMessage);
            handleClose();
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ocurrió un error');
        }
    }, [validateForm, isEditMode, clienteToEdit, ruc, razonSocial, nombreComercial, direccionFiscal, tipoEstado, ultimoContacto, comentario, proximaFecha, updateMutation, createMutation, config.successMessage, handleClose]);

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            <ModalHeader icon={config.icon} title={config.title} />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">

                {/* Error banner */}
                {hasErrors && touched.size > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-700">Por favor corrija los errores:</p>
                            <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                                {Object.values(errors).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* RUC */}
                <div className="space-y-1.5">
                    <label htmlFor="ruc" className="text-xs font-bold text-gray-500 uppercase tracking-wider">RUC</label>
                    <input
                        id="ruc"
                        type="text"
                        value={ruc}
                        onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        onBlur={() => handleBlur('ruc', ruc)}
                        placeholder="20123456789"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors font-mono ${touched.has('ruc') && errors.ruc
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                        maxLength={11}
                    />
                    {touched.has('ruc') && errors.ruc && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.ruc}
                        </p>
                    )}
                </div>

                {/* Razón Social */}
                <div className="space-y-1.5">
                    <label htmlFor="razon_social" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Razón Social <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="razon_social"
                        type="text"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        onBlur={() => handleBlur('razon_social', razonSocial)}
                        placeholder="Empresa SAC"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('razon_social') && errors.razon_social
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                        autoFocus
                    />
                    {touched.has('razon_social') && errors.razon_social && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.razon_social}
                        </p>
                    )}
                </div>

                {/* Nombre Comercial */}
                <div className="space-y-1.5">
                    <label htmlFor="nombre_comercial" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Comercial</label>
                    <input
                        id="nombre_comercial"
                        type="text"
                        value={nombreComercial}
                        onChange={(e) => setNombreComercial(e.target.value)}
                        placeholder="Nombre de marca (opcional)"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    />
                </div>

                {/* Dirección Fiscal */}
                <div className="space-y-1.5">
                    <label htmlFor="direccion" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección Fiscal</label>
                    <input
                        id="direccion"
                        type="text"
                        value={direccionFiscal}
                        onChange={(e) => setDireccionFiscal(e.target.value)}
                        placeholder="Av. Principal 123, Lima"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                    <label htmlFor="estado" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</label>
                    <select
                        id="estado"
                        value={tipoEstado}
                        onChange={(e) => setTipoEstado(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    >
                        <option value="PROSPECTO">Prospecto</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="INACTIVO">Inactivo</option>
                    </select>
                </div>

                {/* Fecha de Último Contacto */}
                <div className="space-y-1.5">
                    <label htmlFor="ultimo_contacto" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Fecha de Último Contacto <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="ultimo_contacto"
                        type="date"
                        value={ultimoContacto}
                        onChange={(e) => setUltimoContacto(e.target.value)}
                        onBlur={() => handleBlur('ultimo_contacto', ultimoContacto)}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('ultimo_contacto') && errors.ultimo_contacto
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('ultimo_contacto') && errors.ultimo_contacto && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.ultimo_contacto}
                        </p>
                    )}
                </div>

                {/* Próxima Fecha de Contacto */}
                <div className="space-y-1.5">
                    <label htmlFor="proxima_fecha" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Próxima Fecha de Contacto <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="proxima_fecha"
                        type="date"
                        value={proximaFecha}
                        onChange={(e) => setProximaFecha(e.target.value)}
                        onBlur={() => handleBlur('proxima_fecha_contacto', proximaFecha)}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('proxima_fecha_contacto') && errors.proxima_fecha_contacto
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('proxima_fecha_contacto') && errors.proxima_fecha_contacto && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.proxima_fecha_contacto}
                        </p>
                    )}
                </div>

                {/* Comentario */}
                <div className="space-y-1.5">
                    <label htmlFor="comentario" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Comentario <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="comentario"
                        rows={2}
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        onBlur={() => handleBlur('comentario', comentario)}
                        placeholder="Notas sobre el cliente..."
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none resize-none text-sm transition-colors ${touched.has('comentario') && errors.comentario
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('comentario') && errors.comentario && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.comentario}
                        </p>
                    )}
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
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEditMode ? 'Actualizar' : 'Guardar'}</>}
                </button>
            </ModalFooter>
        </>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ModalCliente({ isOpen, onClose, clienteToEdit = null }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalContent clienteToEdit={clienteToEdit} isOpen={isOpen} />
        </ModalBase>
    );
}
