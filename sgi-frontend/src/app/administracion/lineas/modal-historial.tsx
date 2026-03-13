'use client';

import React from 'react';
import { History, Smartphone, User, ArrowRight } from 'lucide-react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

import { useLineaHistorial } from '@/hooks/organizacion/useLineas';
import { Linea } from '@/types/organizacion/linea';

interface ModalHistorialProps {
    isOpen: boolean;
    onClose: () => void;
    linea: Linea | null;
}

const TIPO_CAMBIO_LABELS: Record<string, { label: string; color: string }> = {
    'CREACION': { label: 'Creación', color: 'bg-blue-100 text-blue-700' },
    'CAMBIO_CELULAR': { label: 'Cambio de Celular', color: 'bg-purple-100 text-purple-700' },
    'ASIGNACION': { label: 'Asignación', color: 'bg-green-100 text-green-700' },
    'DESASIGNACION': { label: 'Desasignación', color: 'bg-orange-100 text-orange-700' },
    'BAJA': { label: 'Baja', color: 'bg-red-100 text-red-700' },
};

export default function ModalHistorial({ isOpen, onClose, linea }: ModalHistorialProps) {
    const { data: historial = [], isLoading } = useLineaHistorial(linea?.id || null);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <ModalHeader
                icon={<History size={20} className="text-purple-600" />}
                title="Historial de Línea"
            />

            {/* Info */}
            {linea && (
                <div className="p-4 bg-purple-50 border-b border-purple-100">
                    <p className="text-sm text-purple-800">
                        <strong>Línea:</strong> {linea.numero} ({linea.gmail})
                    </p>
                </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-5 max-h-[60vh]">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                ) : historial.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No hay historial registrado</div>
                ) : (
                    <div className="space-y-4">
                        {historial.map((h) => {
                            const tipo = TIPO_CAMBIO_LABELS[h.tipo_cambio] || { label: h.tipo_cambio, color: 'bg-gray-100 text-gray-700' };

                            return (
                                <div key={h.id} className="border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${tipo.color}`}>
                                            {tipo.label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(h.fecha_cambio).toLocaleString('es-PE')}
                                        </span>
                                    </div>

                                    {/* Cambio de celular */}
                                    {(h.activo_anterior_nombre || h.activo_nuevo_nombre) && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                            <Smartphone size={14} className="text-blue-500" />
                                            <span>{h.activo_anterior_nombre || 'Sin celular'}</span>
                                            <ArrowRight size={14} />
                                            <span className="font-medium">{h.activo_nuevo_nombre || 'Sin celular'}</span>
                                        </div>
                                    )}

                                    {/* Cambio de empleado */}
                                    {(h.empleado_anterior_nombre || h.empleado_nuevo_nombre) && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                            <User size={14} className="text-green-500" />
                                            <span>{h.empleado_anterior_nombre || 'Sin asignar'}</span>
                                            <ArrowRight size={14} />
                                            <span className="font-medium">{h.empleado_nuevo_nombre || 'Sin asignar'}</span>
                                        </div>
                                    )}

                                    {h.observaciones && (
                                        <p className="text-xs text-gray-500 mt-2 italic">&quot;{h.observaciones}&quot;</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ModalFooter>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cerrar
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
