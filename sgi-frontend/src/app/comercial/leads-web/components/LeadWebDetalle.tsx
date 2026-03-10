'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LeadWeb } from '@/types/lead-web';
import { UseMutationResult } from '@tanstack/react-query';
import {
    X, Globe, Mail, Phone, MessageSquare, Tag, ChevronRight,
    CheckCircle2, AlertCircle, UserPlus, Save, ExternalLink,
    Clock, User
} from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS_MAP = [
    { value: 'NUEVO', label: 'Nuevo', color: 'text-blue-600' },
    { value: 'PENDIENTE', label: 'Pendiente', color: 'text-amber-600' },
    { value: 'EN_GESTION', label: 'En Gestión', color: 'text-emerald-600' },
];

const MOTIVOS_DESCARTE = [
    'Solo consulta general',
    'No realizamos el servicio',
    'No responde al contacto',
    'Spam / Bot',
    'Duplicado',
    'Información falsa',
];

const PAGINA_INFO: Record<string, { label: string; color: string }> = {
    'grupocorban.pe': { label: 'Grupo Corban', color: 'from-blue-500 to-blue-600' },
    'corbantranslogistic.com': { label: 'Corban Trans Logistic', color: 'from-teal-500 to-emerald-600' },
    'corbanaduanas.pe': { label: 'Corban Aduanas', color: 'from-indigo-500 to-violet-600' },
    'eblgroup.pe': { label: 'EBL Group', color: 'from-red-500 to-rose-600' },
};

interface Props {
    lead: LeadWeb;
    onClose: () => void;
    onEstadoCambiado: (estado: string) => void;
    cambiarEstadoMutation: UseMutationResult<any, any, any>;
    descartarMutation: UseMutationResult<any, any, any>;
    convertirMutation: UseMutationResult<any, any, any>;
    actualizarNotasMutation: UseMutationResult<any, any, any>;
}

export default function LeadWebDetalle({
    lead,
    onClose,
    onEstadoCambiado,
    cambiarEstadoMutation,
    descartarMutation,
    convertirMutation,
    actualizarNotasMutation,
}: Props) {
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [discardData, setDiscardData] = useState({ motivo_descarte: '', comentario_descarte: '' });
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [notas, setNotas] = useState(lead.notas || '');
    const [notasEditando, setNotasEditando] = useState(false);

    const paginaInfo = PAGINA_INFO[lead.pagina_origen] || { label: lead.pagina_origen, color: 'from-slate-400 to-slate-500' };
    const initial = lead.nombre.charAt(0).toUpperCase();

    const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevoEstado = e.target.value;
        if (nuevoEstado === 'DESCARTADO') {
            setShowDiscardModal(true);
            return;
        }
        try {
            await cambiarEstadoMutation.mutateAsync({ id: lead.id, estado: nuevoEstado });
            toast.success('Estado actualizado');
            onEstadoCambiado(nuevoEstado);
        } catch {
            toast.error('Error al cambiar el estado');
        }
    };

    const handleConvertir = async () => {
        try {
            await convertirMutation.mutateAsync({
                id: lead.id,
                request: { crear_prospecto: true }
            });
            toast.success('Lead convertido a prospecto');
            onEstadoCambiado('CONVERTIDO');
        } catch {
            toast.error('Error al convertir el lead');
        }
    };

    const handleGuardarNotas = async () => {
        try {
            await actualizarNotasMutation.mutateAsync({ id: lead.id, notas });
            toast.success('Notas guardadas');
            setNotasEditando(false);
        } catch {
            toast.error('Error al guardar notas');
        }
    };

    const confirmDescartar = async () => {
        if (!discardData.motivo_descarte) {
            toast.error('Selecciona un motivo de descarte');
            return;
        }
        if (!discardData.comentario_descarte.trim()) {
            toast.error('Ingresa un comentario');
            return;
        }
        setIsDiscarding(true);
        try {
            await descartarMutation.mutateAsync({ id: lead.id, request: discardData });
            toast.success('Lead descartado');
            setShowDiscardModal(false);
            onEstadoCambiado('DESCARTADO');
        } catch {
            toast.error('Error al descartar');
        } finally {
            setIsDiscarding(false);
        }
    };

    const formatFecha = (fecha: string | null) => {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const isCerrado = lead.estado === 'CONVERTIDO' || lead.estado === 'DESCARTADO';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="font-semibold text-slate-700 text-sm">Detalle del Lead</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Perfil */}
            <div className="px-5 py-5 text-center border-b border-slate-100">
                <div className={`
                    w-20 h-20 bg-gradient-to-br ${paginaInfo.color}
                    rounded-2xl flex items-center justify-center text-white font-bold text-3xl
                    mx-auto mb-3 shadow-lg shadow-slate-200/50
                `}>
                    {initial}
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{lead.nombre}</h3>
                <p className="text-sm text-indigo-500 font-medium mt-1">{lead.asunto}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold
                    bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Globe size={12} />
                    {paginaInfo.label}
                </div>
            </div>

            {/* Estado (si no está cerrado) */}
            {!isCerrado && (
                <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-2.5">
                        <Tag size={14} className="text-slate-400" />
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Estado del Lead
                        </label>
                    </div>
                    <select
                        value={lead.estado}
                        onChange={handleEstadoChange}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium
                            focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                            transition-all cursor-pointer"
                    >
                        {ESTADOS_MAP.map(est => (
                            <option key={est.value} value={est.value}>{est.label}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Acciones rápidas de contacto */}
            <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-2.5">
                    <ExternalLink size={14} className="text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Contactar
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <a
                        href={`tel:${lead.telefono}`}
                        className="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 hover:bg-emerald-100
                            rounded-xl text-emerald-700 transition-all border border-emerald-100"
                    >
                        <Phone size={18} />
                        <span className="text-[10px] font-semibold">Llamar</span>
                    </a>
                    <a
                        href={`mailto:${lead.correo}?subject=Re: ${encodeURIComponent(lead.asunto)}`}
                        className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 hover:bg-blue-100
                            rounded-xl text-blue-700 transition-all border border-blue-100"
                    >
                        <Mail size={18} />
                        <span className="text-[10px] font-semibold">Correo</span>
                    </a>
                    <a
                        href={`https://wa.me/51${lead.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${lead.nombre}, recibimos tu consulta sobre "${lead.asunto}" desde nuestra web. ¿En qué podemos ayudarte?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 bg-green-50 hover:bg-green-100
                            rounded-xl text-green-700 transition-all border border-green-100"
                    >
                        <MessageSquare size={18} />
                        <span className="text-[10px] font-semibold">WhatsApp</span>
                    </a>
                </div>
            </div>

            {/* Información de contacto */}
            <div className="px-5 py-4 border-b border-slate-100">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                    Información
                </label>
                <div className="space-y-2.5">
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-center">
                        <Mail className="text-slate-400 flex-shrink-0" size={14} />
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Correo</p>
                            <p className="text-sm font-medium text-slate-700">{lead.correo}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-center">
                        <Phone className="text-slate-400 flex-shrink-0" size={14} />
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Teléfono</p>
                            <p className="text-sm font-medium text-slate-700">{lead.telefono}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-start">
                        <MessageSquare className="text-slate-400 flex-shrink-0 mt-0.5" size={14} />
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Mensaje</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.mensaje}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-center">
                        <Clock className="text-slate-400 flex-shrink-0" size={14} />
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Recibido</p>
                            <p className="text-sm font-medium text-slate-700">{formatFecha(lead.fecha_recepcion)}</p>
                        </div>
                    </div>
                    {lead.nombre_asignado && (
                        <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-center">
                            <User className="text-slate-400 flex-shrink-0" size={14} />
                            <div>
                                <p className="text-[10px] text-slate-400 font-medium uppercase">Asignado a</p>
                                <p className="text-sm font-medium text-slate-700">{lead.nombre_asignado}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notas */}
            <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Notas internas
                    </label>
                    {notasEditando && (
                        <button
                            onClick={handleGuardarNotas}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                            <Save size={12} /> Guardar
                        </button>
                    )}
                </div>
                <textarea
                    rows={3}
                    value={notas}
                    onChange={(e) => { setNotas(e.target.value); setNotasEditando(true); }}
                    placeholder="Escribe notas sobre este lead..."
                    disabled={isCerrado}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2.5
                        focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                        resize-none disabled:opacity-50 transition-all"
                />
            </div>

            {/* Botones de acción */}
            {!isCerrado && (
                <div className="px-5 py-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                        <ChevronRight size={14} className="text-slate-400" />
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Acciones
                        </label>
                    </div>
                    <button
                        onClick={handleConvertir}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold
                            flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 hover:shadow-md transition-all"
                    >
                        <CheckCircle2 size={15} /> Convertir a Prospecto
                    </button>
                    <button
                        onClick={() => setShowDiscardModal(true)}
                        className="w-full py-2.5 px-4 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl text-sm font-medium
                            flex items-center justify-center gap-2 transition-all border border-slate-200 hover:border-red-200"
                    >
                        Descartar Lead
                    </button>
                </div>
            )}

            {/* Estado cerrado */}
            {isCerrado && (
                <div className={`px-5 py-4 ${lead.estado === 'CONVERTIDO' ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <p className={`text-sm font-semibold text-center ${lead.estado === 'CONVERTIDO' ? 'text-green-700' : 'text-slate-500'}`}>
                        {lead.estado === 'CONVERTIDO' ? '✅ Lead convertido a cliente' : '❌ Lead descartado'}
                    </p>
                    {lead.fecha_gestion && (
                        <p className="text-xs text-center text-slate-400 mt-1">
                            {formatFecha(lead.fecha_gestion)}
                        </p>
                    )}
                </div>
            )}

            {/* Modal de descarte */}
            {showDiscardModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-red-700">Descartar Lead</h3>
                                <p className="text-xs text-red-400">El lead se marcará como descartado</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Motivo <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl shadow-sm focus:border-red-400 focus:ring-red-200 text-sm py-2.5 px-3"
                                    value={discardData.motivo_descarte}
                                    onChange={(e) => setDiscardData({ ...discardData, motivo_descarte: e.target.value })}
                                >
                                    <option value="">-- Selecciona un motivo --</option>
                                    {MOTIVOS_DESCARTE.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Comentario <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl shadow-sm focus:border-red-400 focus:ring-red-200 text-sm py-2.5 px-3 resize-none"
                                    placeholder="Describe brevemente el motivo..."
                                    value={discardData.comentario_descarte}
                                    onChange={(e) => setDiscardData({ ...discardData, comentario_descarte: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => {
                                    setShowDiscardModal(false);
                                    setDiscardData({ motivo_descarte: '', comentario_descarte: '' });
                                }}
                                disabled={isDiscarding}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDescartar}
                                disabled={isDiscarding}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {isDiscarding ? 'Descartando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
