'use client';

import React from 'react';
import { X, Loader2, FileText, Phone, MessageSquare, Mail, ArrowRight } from 'lucide-react';
import { useClienteTimeline } from '@/hooks/comercial/useClienteTimeline';

const ESTADO_COLORS: Record<string, string> = {
    'PROSPECTO': 'bg-sky-50 text-sky-700',
    'EN_NEGOCIACION': 'bg-amber-50 text-amber-700',
    'CERRADA': 'bg-green-50 text-green-700',
    'EN_OPERACION': 'bg-indigo-50 text-indigo-700',
    'CARGA_ENTREGADA': 'bg-emerald-50 text-emerald-700',
    'CAIDO': 'bg-red-50 text-red-700',
    'INACTIVO': 'bg-gray-100 text-gray-500',
};

const ESTADO_LABELS: Record<string, string> = {
    'PROSPECTO': 'Prospecto',
    'EN_NEGOCIACION': 'En negociación',
    'CERRADA': 'Cerrada',
    'EN_OPERACION': 'En operación',
    'CARGA_ENTREGADA': 'Carga entregada',
    'CAIDO': 'Caído',
    'INACTIVO': 'Inactivo',
};

const ORIGEN_LABELS: Record<string, string> = {
    'BASE_DATOS': 'Base de datos',
    'WHATSAPP': 'WhatsApp',
    'CARTERA_PROPIA': 'Cartera propia',
    'PUBLICIDAD_META': 'Publicidad Meta',
    'REFERIDO': 'Referido',
    'OTRO': 'Otro',
    'Manual': 'Creación directa',
};

const ACCION_ICONS: Record<string, React.ReactNode> = {
    'Llamada': <Phone size={14} />,
    'WhatsApp': <MessageSquare size={14} />,
    'Email': <Mail size={14} />,
    'Correo': <Mail size={14} />,
};

const ACCION_COLORS: Record<string, string> = {
    'Llamada': 'bg-blue-50 text-blue-600',
    'WhatsApp': 'bg-green-50 text-green-600',
    'Email': 'bg-orange-50 text-orange-600',
    'Correo': 'bg-orange-50 text-orange-600',
};

const MOTIVO_LABELS: Record<string, string> = {
    'SEGUIMIENTO_CARGA': 'Seguimiento de carga',
    'FIDELIZACION': 'Fidelización',
    'DUDAS_CLIENTE': 'Dudas del cliente',
    'QUIERE_COTIZACION': 'Quiere cotización',
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: '2-digit'
    });
};

interface Props {
    clienteId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ModalTimeline({ clienteId, isOpen, onClose }: Props) {
    const { data, isLoading } = useClienteTimeline(isOpen ? clienteId : null);

    if (!isOpen) return null;

    const cliente = data?.cliente;
    const eventos = data?.eventos || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
                    <div className="flex-1 min-w-0">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Cargando...</span>
                            </div>
                        ) : cliente ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <FileText size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-800 leading-tight">
                                            {cliente.razon_social}
                                        </h2>
                                        {cliente.ruc && (
                                            <span className="text-xs text-gray-400 font-mono">{cliente.ruc}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Fuente:</span>
                                    <span className="px-2.5 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200 shadow-sm">
                                        {ORIGEN_LABELS[cliente.origen] || cliente.origen}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400">Cliente no encontrado</span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Loader2 size={32} className="animate-spin mb-2" />
                            <p className="text-sm">Cargando trazabilidad...</p>
                        </div>
                    ) : eventos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <FileText size={32} className="mb-2 opacity-60" />
                            <p className="text-sm font-medium">Sin registros</p>
                            <p className="text-xs mt-1">Este cliente aún no tiene actividad registrada</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                                <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
                                    <th className="pl-6 pr-3 py-3 font-semibold w-[100px]">Fecha</th>
                                    <th className="px-3 py-3 font-semibold w-[130px]">Acción</th>
                                    <th className="px-3 py-3 font-semibold">Motivo</th>
                                    <th className="px-3 py-3 font-semibold w-[140px]">Estado</th>
                                    <th className="px-3 py-3 font-semibold pr-6">Comentario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventos.map((ev, idx) => {
                                    const estadoCambio = !!ev.estado_anterior;

                                    return (
                                        <tr
                                            key={idx}
                                            className={`transition-colors hover:bg-indigo-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                        >
                                            <td className="pl-6 pr-3 py-3">
                                                <span className="text-xs font-medium text-gray-600 tabular-nums">
                                                    {formatDate(ev.fecha)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div>
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${ACCION_COLORS[ev.accion] || 'bg-gray-50 text-gray-600'}`}>
                                                        {ACCION_ICONS[ev.accion] || <ArrowRight size={14} />}
                                                        {ev.accion}
                                                    </span>
                                                    {ev.contacto && (
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 pl-1">{ev.contacto}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs text-gray-700">{MOTIVO_LABELS[ev.motivo] || ev.motivo}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                {estadoCambio ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${ESTADO_COLORS[ev.estado_anterior!] || 'bg-gray-50 text-gray-500'} opacity-60 line-through`}>
                                                            {ESTADO_LABELS[ev.estado_anterior!] || ev.estado_anterior}
                                                        </span>
                                                        <ArrowRight size={10} className="text-gray-400 flex-shrink-0" />
                                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${ESTADO_COLORS[ev.estado] || 'bg-gray-50 text-gray-500'} ring-2 ring-offset-1 ring-indigo-300`}>
                                                            {ESTADO_LABELS[ev.estado] || ev.estado}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${ESTADO_COLORS[ev.estado] || 'bg-gray-50 text-gray-500'}`}>
                                                        {ESTADO_LABELS[ev.estado] || ev.estado}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 pr-6">
                                                <span className="text-xs text-gray-600 line-clamp-2">{ev.comentario}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {eventos.length} {eventos.length === 1 ? 'registro' : 'registros'}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
