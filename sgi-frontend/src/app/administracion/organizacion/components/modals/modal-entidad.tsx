'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, LayoutGrid, Loader2, GitGraph, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartamentos, useEmpleadosParaSelect, useDepartamentosParaSelect } from '@/hooks/organizacion/useDepartamento';
import { useAreas, useAreasParaSelect } from '@/hooks/organizacion/useArea';
import { useCargos } from '@/hooks/organizacion/useCargo';
import { Departamento } from '@/types/organizacion/departamento';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';

// ============================================
// TIPOS
// ============================================
type EntityType = 'departamento' | 'area' | 'cargo';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: EntityType;
    departamentoToEdit?: Departamento | null;
    parentDepartamentoId?: number | null;
    parentAreaId?: number | null;
}

interface EntityConfig {
    title: string;
    icon: React.ReactNode;
    successMessage: string;
}

interface ModalContentProps {
    entityType: EntityType;
    departamentoToEdit: Departamento | null;
    parentDepartamentoId: number | null;
    parentAreaId: number | null;
    isOpen: boolean;
}

interface FormErrors {
    nombre?: string;
    departamentoId?: string;
    areaId?: string;
}

// ============================================
// CONFIGURACIÓN POR ENTIDAD
// ============================================
const getEntityConfig = (entityType: EntityType, isEditing: boolean): EntityConfig => {
    const configs: Record<EntityType, EntityConfig> = {
        departamento: {
            title: isEditing ? 'Editar Departamento' : 'Nuevo Departamento',
            icon: <LayoutGrid size={20} className="text-indigo-600" />,
            successMessage: isEditing ? 'Departamento actualizado correctamente' : 'Departamento creado correctamente',
        },
        area: {
            title: isEditing ? 'Editar Área' : 'Nueva Área',
            icon: <GitGraph size={20} className="text-blue-600" />,
            successMessage: isEditing ? 'Área actualizada correctamente' : 'Área creada correctamente',
        },
        cargo: {
            title: isEditing ? 'Editar Cargo' : 'Nuevo Cargo',
            icon: <Briefcase size={20} className="text-purple-600" />,
            successMessage: isEditing ? 'Cargo actualizado correctamente' : 'Cargo creado correctamente',
        },
    };
    return configs[entityType];
};

// ============================================
// COMPONENTE INTERNO (usa el contexto del modal)
// ============================================
function ModalContent({
    entityType,
    departamentoToEdit,
    parentDepartamentoId,
    parentAreaId,
    isOpen,
}: ModalContentProps) {
    const { handleClose } = useModalContext();

    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [responsableId, setResponsableId] = useState<number | null>(null);
    const [departamentoId, setDepartamentoId] = useState<number | null>(null);
    const [areaId, setAreaId] = useState<number | null>(null);

    // Estados de validación
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // Mutations
    const { createMutation: createDeptoMutation, updateMutation: updateDeptoMutation } = useDepartamentos();
    const { createMutation: createAreaMutation } = useAreas();
    const { createMutation: createCargoMutation } = useCargos();

    // Dropdowns
    const { data: empleados = [], isLoading: loadingEmpleados } = useEmpleadosParaSelect();
    const { data: departamentos = [], isLoading: loadingDepartamentos } = useDepartamentosParaSelect();
    const { data: areas = [], isLoading: loadingAreas } = useAreasParaSelect();

    // Derivados
    const isEditing = useMemo(() => !!departamentoToEdit, [departamentoToEdit]);
    const isLoading = createDeptoMutation.isPending || updateDeptoMutation.isPending || createAreaMutation.isPending || createCargoMutation.isPending;
    const config = useMemo(() => getEntityConfig(entityType, isEditing), [entityType, isEditing]);
    const showResponsable = entityType === 'departamento' || entityType === 'area';

    // Reset form
    useEffect(() => {
        if (!isOpen) return;

        if (departamentoToEdit && entityType === 'departamento') {
            setNombre(departamentoToEdit.nombre || '');
            setDescripcion(departamentoToEdit.descripcion || '');
            setResponsableId(departamentoToEdit.responsable_id || null);
        } else {
            setNombre('');
            setDescripcion('');
            setResponsableId(null);
            setDepartamentoId(parentDepartamentoId);
            setAreaId(parentAreaId);
        }
        setErrors({});
        setTouched(new Set());
    }, [departamentoToEdit, isOpen, parentDepartamentoId, parentAreaId, entityType]);

    // Validar un campo
    const validateField = (field: string, value: string | number | null): string | undefined => {
        switch (field) {
            case 'nombre':
                if (!value || (typeof value === 'string' && !value.trim())) return 'El nombre es requerido';
                if (typeof value === 'string' && value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
                break;
            case 'departamentoId':
                if (entityType === 'area' && !value) return 'Debe seleccionar un departamento';
                break;
            case 'areaId':
                if (entityType === 'cargo' && !value) return 'Debe seleccionar un área';
                break;
        }
        return undefined;
    };

    // Validar todo el formulario
    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        const nombreError = validateField('nombre', nombre);
        if (nombreError) newErrors.nombre = nombreError;

        if (entityType === 'area') {
            const deptoError = validateField('departamentoId', departamentoId);
            if (deptoError) newErrors.departamentoId = deptoError;
        }

        if (entityType === 'cargo') {
            const areaError = validateField('areaId', areaId);
            if (areaError) newErrors.areaId = areaError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [nombre, entityType, departamentoId, areaId]);

    // Manejar blur para validación
    const handleBlur = (field: string, value: string | number | null) => {
        setTouched(prev => new Set(prev).add(field));
        const error = validateField(field, value);
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field as keyof FormErrors] = error;
            } else {
                delete newErrors[field as keyof FormErrors];
            }
            return newErrors;
        });
    };

    // Manejar cambio con validación instantánea si ya fue tocado
    const handleNombreChange = (value: string) => {
        setNombre(value);
        if (touched.has('nombre')) {
            const error = validateField('nombre', value);
            setErrors(prev => {
                const newErrors = { ...prev };
                if (error) newErrors.nombre = error;
                else delete newErrors.nombre;
                return newErrors;
            });
        }
    };

    // Submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Marcar todos como tocados
        setTouched(new Set(['nombre', 'departamentoId', 'areaId']));

        if (!validateForm()) {
            toast.error('Por favor corrija los errores en el formulario');
            return;
        }

        try {
            switch (entityType) {
                case 'departamento': {
                    const payload = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, responsable_id: responsableId };
                    if (isEditing && departamentoToEdit) {
                        await updateDeptoMutation.mutateAsync({ id: departamentoToEdit.id, data: payload });
                    } else {
                        await createDeptoMutation.mutateAsync(payload);
                    }
                    break;
                }
                case 'area': {
                    if (!departamentoId) return;
                    await createAreaMutation.mutateAsync({
                        nombre: nombre.trim(),
                        descripcion: descripcion.trim() || null,
                        responsable_id: responsableId,
                        departamento_id: departamentoId,
                    });
                    break;
                }
                case 'cargo': {
                    if (!areaId) return;
                    await createCargoMutation.mutateAsync({
                        nombre: nombre.trim(),
                        descripcion: descripcion.trim() || null,
                        area_id: areaId,
                    });
                    break;
                }
            }
            toast.success(config.successMessage);
            handleClose();
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ocurrió un error');
        }
    }, [validateForm, entityType, nombre, descripcion, responsableId, departamentoId, areaId, isEditing, departamentoToEdit, updateDeptoMutation, createDeptoMutation, createAreaMutation, createCargoMutation, config.successMessage, handleClose]);

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            <ModalHeader icon={config.icon} title={config.title} />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

                {/* Banner de errores */}
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

                {/* Nombre */}
                <div className="space-y-1.5">
                    <label htmlFor="nombre" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => handleNombreChange(e.target.value)}
                        onBlur={() => handleBlur('nombre', nombre)}
                        placeholder={`Ej. ${entityType === 'departamento' ? 'Comercial' : entityType === 'area' ? 'Ventas' : 'Gerente'}`}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('nombre') && errors.nombre
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                                : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'
                            }`}
                        disabled={isLoading}
                        autoFocus
                    />
                    {touched.has('nombre') && errors.nombre && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors.nombre}
                        </p>
                    )}
                </div>

                {/* Departamento (para áreas) */}
                {entityType === 'area' && (
                    <div className="space-y-1.5">
                        <label htmlFor="departamento" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Departamento <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="departamento"
                            value={departamentoId ?? ''}
                            onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setDepartamentoId(val);
                                if (touched.has('departamentoId')) {
                                    const error = validateField('departamentoId', val);
                                    setErrors(prev => {
                                        const newErrors = { ...prev };
                                        if (error) newErrors.departamentoId = error;
                                        else delete newErrors.departamentoId;
                                        return newErrors;
                                    });
                                }
                            }}
                            onBlur={() => handleBlur('departamentoId', departamentoId)}
                            className={`w-full px-3 py-2.5 rounded-xl border outline-none bg-white text-sm cursor-pointer transition-colors ${touched.has('departamentoId') && errors.departamentoId
                                    ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                                    : 'border-gray-200 focus:ring-2 focus:ring-blue-500/50'
                                }`}
                            disabled={isLoading || loadingDepartamentos}
                        >
                            <option value="">Seleccionar departamento...</option>
                            {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                        {touched.has('departamentoId') && errors.departamentoId && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {errors.departamentoId}
                            </p>
                        )}
                    </div>
                )}

                {/* Área (para cargos) */}
                {entityType === 'cargo' && (
                    <div className="space-y-1.5">
                        <label htmlFor="area" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Área <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="area"
                            value={areaId ?? ''}
                            onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setAreaId(val);
                                if (touched.has('areaId')) {
                                    const error = validateField('areaId', val);
                                    setErrors(prev => {
                                        const newErrors = { ...prev };
                                        if (error) newErrors.areaId = error;
                                        else delete newErrors.areaId;
                                        return newErrors;
                                    });
                                }
                            }}
                            onBlur={() => handleBlur('areaId', areaId)}
                            className={`w-full px-3 py-2.5 rounded-xl border outline-none bg-white text-sm cursor-pointer transition-colors ${touched.has('areaId') && errors.areaId
                                    ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                                    : 'border-gray-200 focus:ring-2 focus:ring-purple-500/50'
                                }`}
                            disabled={isLoading || loadingAreas}
                        >
                            <option value="">Seleccionar área...</option>
                            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                        {touched.has('areaId') && errors.areaId && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {errors.areaId}
                            </p>
                        )}
                    </div>
                )}

                {/* Responsable */}
                {showResponsable && (
                    <div className="space-y-1.5">
                        <label htmlFor="responsable" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Responsable</label>
                        <select
                            id="responsable"
                            value={responsableId ?? ''}
                            onChange={(e) => setResponsableId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                            disabled={isLoading || loadingEmpleados}
                        >
                            <option value="">Sin asignar</option>
                            {empleados.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>)}
                        </select>
                    </div>
                )}

                {/* Descripción */}
                <div className="space-y-1.5">
                    <label htmlFor="descripcion" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                    <textarea
                        id="descripcion"
                        rows={2}
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none resize-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Notas breves (opcional)..."
                        disabled={isLoading}
                    />
                </div>
            </form>

            <ModalFooter>
                <button type="button" onClick={handleClose} disabled={isLoading} className="cursor-pointer flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white hover:border-gray-400 disabled:opacity-50">
                    Cancelar
                </button>
                <button type="submit" onClick={handleSubmit} disabled={isLoading} className="cursor-pointer flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEditing ? 'Actualizar' : 'Guardar'}</>}
                </button>
            </ModalFooter>
        </>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ModalEntidad({
    isOpen,
    onClose,
    entityType,
    departamentoToEdit = null,
    parentDepartamentoId = null,
    parentAreaId = null,
}: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalContent
                entityType={entityType}
                departamentoToEdit={departamentoToEdit}
                parentDepartamentoId={parentDepartamentoId}
                parentAreaId={parentAreaId}
                isOpen={isOpen}
            />
        </ModalBase>
    );
}
