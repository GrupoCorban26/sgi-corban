'use client';

import React from 'react';
import { X, Phone, Smartphone, User, Calendar, CreditCard, Building2, FileText, Mail } from 'lucide-react';
import { Linea } from '@/types/organizacion/linea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalDetalleLineaProps {
    isOpen: boolean;
    onClose: () => void;
    linea: Linea | null;
}

export default function ModalDetalleLinea({ isOpen, onClose, linea }: ModalDetalleLineaProps) {
    if (!isOpen || !linea) return null;

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'No asignado';
        try {
            return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Phone className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Detalles de la Línea</h2>
                            <p className="text-sm text-gray-500 font-medium">Información completa del registro</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Información Principal */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Información de la Línea
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                                    <Phone size={14} /> Número
                                </label>
                                <p className="text-gray-900 font-semibold text-lg">{linea.numero}</p>
                            </div>
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                                    <Mail size={14} /> Gmail Configurado
                                </label>
                                <p className="text-gray-900 font-medium">{linea.gmail}</p>
                            </div>
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                                    <Building2 size={14} /> Operador
                                </label>
                                <p className="text-gray-900 font-medium">{linea.operador || 'No especificado'}</p>
                            </div>
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                                    <CreditCard size={14} /> Plan
                                </label>
                                <p className="text-gray-900 font-medium">{linea.plan || 'No especificado'}</p>
                            </div>
                            <div className="group md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                                    <Building2 size={14} /> Proveedor
                                </label>
                                <p className="text-gray-900 font-medium">{linea.proveedor || 'No especificado'}</p>
                            </div>
                        </div>
                    </section>

                    {/* Dispositivo Asociado */}
                    <section className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Dispositivo Asociado
                        </h3>
                        {linea.activo_nombre ? (
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100 text-blue-600">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-gray-900 font-semibold text-lg">{linea.activo_nombre}</p>
                                    <p className="text-blue-600/80 text-sm font-medium mt-0.5">Dispositivo actualmente vinculado</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-500 italic bg-white/50 p-3 rounded-xl border border-dashed border-gray-300">
                                <Smartphone size={18} />
                                No hay dispositivo vinculado a esta línea
                            </div>
                        )}
                    </section>

                    {/* Empleado Asignado */}
                    <section className="bg-green-50/50 rounded-2xl p-5 border border-green-100/50">
                        <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Empleado Responsable
                        </h3>
                        {linea.empleado_nombre ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4 md:col-span-2">
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-green-100 text-green-600">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-semibold text-lg">{linea.empleado_nombre}</p>
                                        <p className="text-green-600/80 text-sm font-medium mt-0.5">Responsable actual</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-green-600/70 mb-1.5 uppercase tracking-wide">
                                        <Calendar size={12} /> Fecha de Asignación
                                    </label>
                                    <p className="text-gray-900 font-medium">{formatDate(linea.fecha_asignacion)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-500 italic bg-white/50 p-3 rounded-xl border border-dashed border-gray-300">
                                <User size={18} />
                                Disponible para asignación
                            </div>
                        )}
                    </section>

                    {/* Observaciones */}
                    {linea.observaciones && (
                        <section>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText size={14} /> Observaciones
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed border border-gray-100">
                                {linea.observaciones}
                            </div>
                        </section>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
