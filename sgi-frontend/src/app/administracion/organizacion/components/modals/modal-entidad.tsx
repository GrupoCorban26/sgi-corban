'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, LayoutGrid, Loader2, GitGraph, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartamentos, useEmpleadosParaSelect, useDepartamentosParaSelect } from '@/hooks/organizacion/useDepartamento';
import { useAreas, useAreasParaSelect } from '@/hooks/organizacion/useArea';
import { useCargos } from '@/hooks/organizacion/useCargo';
import { Departamento } from '@/types/organizacion/departamento';
import { ModalBase, ModalHeader, ModalFooter } from './modal-base';

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
    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [responsableId, setResponsableId] = useState<number | null>(null);
    const [departamentoId, setDepartamentoId] = useState<number | null>(null);
    const [areaId, setAreaId] = useState<number | null>(null);

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
    }, [departamentoToEdit, isOpen, parentDepartamentoId, parentAreaId, entityType]);

    // Validación
    const validateForm = useCallback((): boolean => {
        if (!nombre.trim()) { toast.error('El nombre es requerido'); return false; }
        if (nombre.trim().length < 3) { toast.error('El nombre debe tener al menos 3 caracteres'); return false; }
        if (entityType === 'area' && !departamentoId) { toast.error('Debe seleccionar un departamento'); return false; }
        if (entityType === 'cargo' && !areaId) { toast.error('Debe seleccionar un área'); return false; }
        return true;
    }, [nombre, entityType, departamentoId, areaId]);

    // Submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

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
            onClose();
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ocurrió un error');
        }
    }, [validateForm, entityType, nombre, descripcion, responsableId, departamentoId, areaId, isEditing, departamentoToEdit, updateDeptoMutation, createDeptoMutation, createAreaMutation, createCargoMutation, config.successMessage, onClose]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} disableClose={isLoading}>
            <ModalHeader icon={config.icon} title={config.title} onClose={onClose} disableClose={isLoading} />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Nombre */}
                <div className="space-y-1.5">
                    <label htmlFor="nombre" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder={`Ej. ${entityType === 'departamento' ? 'Comercial' : entityType === 'area' ? 'Ventas' : 'Gerente'}`}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-sm"
                        disabled={isLoading}
                        autoFocus
                    />
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
                            onChange={(e) => setDepartamentoId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-blue-500/50"
                            disabled={isLoading || loadingDepartamentos}
                        >
                            <option value="">Seleccionar departamento...</option>
                            {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
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
                            onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-purple-500/50"
                            disabled={isLoading || loadingAreas}
                        >
                            <option value="">Seleccionar área...</option>
                            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
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
                <button type="button" onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white hover:border-gray-400 disabled:opacity-50">
                    Cancelar
                </button>
                <button type="submit" onClick={handleSubmit} disabled={isLoading} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEditing ? 'Actualizar' : 'Guardar'}</>}
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
