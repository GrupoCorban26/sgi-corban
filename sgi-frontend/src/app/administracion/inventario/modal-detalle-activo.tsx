'use client';

import React from 'react';
import { FileText, X, Package, User, Smartphone, Monitor, Hash, Calendar } from 'lucide-react';
import { Activo } from '@/types/organizacion/activo';
import { ModalBase } from '@/components/ui/modal';
import { generateCartaResponsabilidad } from '@/utils/pdf-generator';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    activoData: Activo | null;
}

export default function ModalDetalleActivo({ isOpen, onClose, activoData }: ModalProps) {
    if (!activoData) return null;

    const handleGeneratePDF = () => {
        generateCartaResponsabilidad(activoData);
    };

    const getIconoTipo = (nombre: string) => {
        const n = nombre.toLowerCase();
        if (n.includes('laptop') || n.includes('pc')) return <Monitor className="text-blue-500" size={24} />;
        if (n.includes('celular') || n.includes('iphone')) return <Smartphone className="text-emerald-500" size={24} />;
        return <Package className="text-indigo-500" size={24} />;
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                            {getIconoTipo(activoData.producto)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{activoData.producto}</h2>
                            <p className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                                {activoData.codigo_inventario || activoData.serie || 'SIN CÓDIGO'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Detalles Técnicos */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detalles del Equipo</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">Marca</span>
                                <span className="text-sm font-semibold text-gray-800">{activoData.marca || '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">Modelo</span>
                                <span className="text-sm font-semibold text-gray-800">{activoData.modelo || '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">Serie</span>
                                <span className="text-sm font-semibold text-gray-800">{activoData.serie || '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">Estado</span>
                                <span className={`text-sm font-bold ${activoData.estado_nombre === 'BUENO' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {activoData.estado_nombre}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Asignación */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                            Asignación Actual
                            {activoData.is_disponible && <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Disponible en almacén</span>}
                        </h3>

                        {!activoData.is_disponible ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{activoData.empleado_asignado_nombre}</h4>
                                        <p className="text-sm text-indigo-600 mb-2">DNI: {activoData.empleado_asignado_dni || 'No registrado'}</p>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-indigo-100 pt-2 mt-2">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>Desde: {activoData.fecha_asignacion ? new Date(activoData.fecha_asignacion).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </div>

                                        {/* Botón generar Carta */}
                                        <div className="mt-4 pt-3 border-t border-indigo-100 flex justify-end">
                                            <button
                                                onClick={handleGeneratePDF}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <FileText size={16} />
                                                Generar Carta Responsabilidad
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                                <p>Este activo no está asignado a nadie actualmente.</p>
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    {activoData.observaciones && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observaciones</h3>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                {activoData.observaciones}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </ModalBase>
    );
}
