'use client';

import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, MapPin, Target, Gift, Save, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCitas, useComercialesDropdown, SalidaCampoCreate, Cita } from '@/hooks/comercial/useCitas';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

interface ModalSalidaCampoProps {
    isOpen: boolean;
    onClose: () => void;
    salidaToEdit?: Cita | null;
}

export default function ModalSalidaCampo({ isOpen, onClose, salidaToEdit }: ModalSalidaCampoProps) {
    const { createSalidaCampoMutation, updateSalidaCampoMutation } = useCitas();
    const { data: comerciales, isLoading: loadingComerciales } = useComercialesDropdown();

    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [direccion, setDireccion] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [conPresente, setConPresente] = useState(false);
    const [comercialesSeleccionados, setComercialesSeleccionados] = useState<number[]>([]);

    useEffect(() => {
        if (salidaToEdit && salidaToEdit.tipo_agenda === 'SALIDA_CAMPO') {
            setFecha(salidaToEdit.fecha.split('T')[0]);
            setHora(salidaToEdit.hora);
            setDireccion(salidaToEdit.direccion || '');
            setObjetivo(salidaToEdit.objetivo_campo || '');
            setConPresente(salidaToEdit.con_presente);
            setComercialesSeleccionados(
                salidaToEdit.comerciales_asignados?.map(c => c.usuario_id) || []
            );
        } else {
            resetForm();
        }
    }, [salidaToEdit, isOpen]);

    const resetForm = () => {
        setFecha('');
        setHora('');
        setDireccion('');
        setObjetivo('');
        setConPresente(false);
        setComercialesSeleccionados([]);
    };

    const toggleComercial = (id: number) => {
        setComercialesSeleccionados(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fecha || !hora) {
            return toast.error('Debe definir fecha y hora');
        }
        if (!objetivo.trim()) {
            return toast.error('Debe especificar el objetivo de la salida');
        }
        if (comercialesSeleccionados.length === 0) {
            return toast.error('Debe seleccionar al menos un comercial');
        }

        const data: SalidaCampoCreate = {
            fecha,
            hora,
            direccion: direccion || undefined,
            objetivo_campo: objetivo,
            comerciales_ids: comercialesSeleccionados,
            con_presente: conPresente
        };

        try {
            if (salidaToEdit) {
                await updateSalidaCampoMutation.mutateAsync({
                    id: salidaToEdit.id,
                    data: {
                        fecha,
                        hora,
                        direccion,
                        objetivo_campo: objetivo,
                        comerciales_ids: comercialesSeleccionados,
                        con_presente: conPresente
                    }
                });
                toast.success('Salida a campo actualizada');
            } else {
                await createSalidaCampoMutation.mutateAsync(data);
                toast.success('Salida a campo programada correctamente');
            }
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al guardar');
        }
    };

    const isPending = createSalidaCampoMutation.isPending || updateSalidaCampoMutation.isPending;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={<Users className="text-emerald-600" />}
                title={salidaToEdit ? 'Editar Salida a Campo' : 'Nueva Salida a Campo'}
            />

            <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Info */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
                    <strong>Salida a Campo:</strong> Visita sin cliente específico para prospectar nuevas empresas.
                    Seleccione los comerciales que participarán.
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Calendar size={14} /> Fecha
                        </label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Clock size={14} /> Hora
                        </label>
                        <input
                            type="time"
                            value={hora}
                            onChange={(e) => setHora(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                {/* Dirección */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <MapPin size={14} /> Zona / Dirección (opcional)
                    </label>
                    <input
                        type="text"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ej: Zona Industrial de Ate, Miraflores..."
                    />
                </div>

                {/* Objetivo */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Target size={14} /> Objetivo de la Salida *
                    </label>
                    <textarea
                        value={objetivo}
                        onChange={(e) => setObjetivo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        rows={3}
                        placeholder="Describir el objetivo de la salida a campo..."
                    />
                </div>

                {/* Selección de comerciales */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Users size={14} /> Comerciales que Participarán *
                    </label>

                    {loadingComerciales ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                            {comerciales?.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleComercial(c.id)}
                                    className={`flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-all ${comercialesSeleccionados.includes(c.id)
                                        ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-800'
                                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${comercialesSeleccionados.includes(c.id)
                                        ? 'bg-emerald-500'
                                        : 'bg-gray-200'
                                        }`}>
                                        {comercialesSeleccionados.includes(c.id) && (
                                            <Check size={12} className="text-white" />
                                        )}
                                    </div>
                                    <span className="truncate">{c.nombre}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-gray-500">
                        {comercialesSeleccionados.length} comercial(es) seleccionado(s)
                    </p>
                </div>

                {/* Llevar regalo */}
                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="conPresente"
                        checked={conPresente}
                        onChange={(e) => setConPresente(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="conPresente" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
                        <Gift size={16} className="text-pink-500" />
                        Llevar presentes/obsequios
                    </label>
                </div>
            </form>

            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                    disabled={isPending}
                >
                    {isPending && <Loader2 className="animate-spin" size={16} />}
                    {salidaToEdit ? 'Guardar Cambios' : 'Programar Salida'}
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
