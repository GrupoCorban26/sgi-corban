'use client';

import React, { useState } from 'react';
import { UserMinus, Loader2, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Activo, DevolucionActivoRequest } from '@/types/organizacion/activo';
import { useActivos } from '@/hooks/organizacion/useActivo';
import { useEstadosActivosDropdown } from '@/hooks/organizacion/useEstadoActivo';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';

const MOTIVOS_DEVOLUCION = [
    'RENUNCIA',
    'DESPIDO',
    'FIN_CONTRATO',
    'CAMBIO_EQUIPO',
    'OTRO'
];

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    activoData: Activo | null;
}

const ModalDevolucionContent = ({ activoData }: { activoData: Activo }) => {
    const { handleClose } = useModalContext();
    const { data: estados = [] } = useEstadosActivosDropdown();

    // Default to current state or first available
    const [estadoDevolucionId, setEstadoDevolucionId] = useState<number>(
        activoData.estado_id || (estados.length > 0 ? estados[0].id : 0)
    );
    const [motivo, setMotivo] = useState('RENUNCIA');
    const [observaciones, setObservaciones] = useState('');

    const { devolverMutation } = useActivos();
    const isSubmitting = devolverMutation.isPending;

    // Update default state when loaded
    React.useEffect(() => {
        if (!estadoDevolucionId && estados.length > 0) {
            setEstadoDevolucionId(estados[0].id);
        }
    }, [estados, estadoDevolucionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!estadoDevolucionId) {
            toast.error("Seleccione un estado");
            return;
        }

        try {
            const data: DevolucionActivoRequest = {
                estado_devolucion_id: Number(estadoDevolucionId),
                motivo: motivo,
                observaciones: observaciones.trim() || undefined
            };

            await devolverMutation.mutateAsync({ id: activoData.id, data });
            toast.success('Activo devuelto correctamente');
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al procesar devolución');
        }
    };

    return (
        <>
            <ModalHeader
                icon={<UserMinus size={20} className="text-orange-600" />}
                title="Registrar Devolución de Activo"
            />

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Info del Activo */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-orange-600">
                        <Package size={20} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{activoData.producto}</h4>
                        <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                            <div className="flex gap-2">
                                <span>{activoData.marca} {activoData.modelo}</span>
                                {activoData.serie && <span className="bg-gray-200 px-1.5 rounded text-gray-700 font-mono">{activoData.serie}</span>}
                            </div>
                            <div className="mt-1 pt-1 border-t border-gray-200 text-gray-600">
                                Asignado a: <span className="font-semibold text-gray-800">{activoData.empleado_asignado_nombre}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Estado al Devolver</label>
                        <select
                            value={estadoDevolucionId}
                            onChange={(e) => setEstadoDevolucionId(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-orange-500 text-sm transition-all"
                            disabled={isSubmitting}
                        >
                            {estados.map(st => (
                                <option key={st.id} value={st.id}>{st.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Motivo</label>
                        <select
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-orange-500 text-sm transition-all"
                            disabled={isSubmitting}
                        >
                            {MOTIVOS_DEVOLUCION.map(m => (
                                <option key={m} value={m}>{m.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Observaciones</label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none transition-all"
                        placeholder="Detalles sobre la devolución, estado, accesorios faltantes..."
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
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                    Registrar Devolución
                </button>
            </ModalFooter>
        </>
    );
}

export default function ModalDevolucion({ isOpen, onClose, activoData }: ModalProps) {
    if (!activoData) return null;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <ModalDevolucionContent activoData={activoData} />
        </ModalBase>
    );
}
