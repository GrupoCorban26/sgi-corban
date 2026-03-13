import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatConversationPreview } from '@/types/chat';
import { useChatActions } from '@/hooks/comercial/useChat';
import { useInbox } from '@/hooks/comercial/useInbox';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import {
    Building2, Phone, Calendar, Bot, AlertCircle,
    CheckCircle2, X, ChevronRight, Headset, Clock, Tag, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    selectedConv: ChatConversationPreview;
    onChangeConv: (conv: ChatConversationPreview | null) => void;
    onCerrarClick?: () => void;
    onClose?: () => void;
}

const ESTADOS_MAP = [
    { value: 'NUEVO', label: 'Nuevo Lead', color: 'text-blue-600' },
    { value: 'PENDIENTE', label: 'Pendiente de Atención', color: 'text-amber-600' },
    { value: 'EN_GESTION', label: 'En Gestión Activa', color: 'text-emerald-600' },
    { value: 'COTIZADO', label: 'Cotización Enviada', color: 'text-cyan-600' },
];

const MOTIVOS_DESCARTE = [
    'Solo consulta',
    'No realizamos su requerimiento',
    'No responde',
    'Spam / Bot',
    'Duplicado',
];

export default function LeadInfoPanel({ selectedConv, onChangeConv, onCerrarClick, onClose }: Props) {
    const { changeEstado, releaseChat, descartarLead } = useChatActions();
    const { asignarManualMutation } = useInbox();
    const { data: comerciales = [] } = useComerciales();
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [discardData, setDiscardData] = useState({ motivo_descarte: '', comentario_descarte: '' });
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedComercialId, setSelectedComercialId] = useState<number | ''>('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Resetear selección al cambiar de lead
    useEffect(() => {
        setSelectedComercialId('');
    }, [selectedConv.inbox_id]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleAsignarManual = async () => {
        if (!selectedComercialId) {
            toast.error('Selecciona un asesor');
            return;
        }
        setIsAssigning(true);
        try {
            await asignarManualMutation.mutateAsync({
                id: selectedConv.inbox_id,
                comercialId: selectedComercialId as number
            });
            toast.success('Lead asignado exitosamente');
            onChangeConv({ ...selectedConv, estado: 'PENDIENTE', modo: 'ASESOR' });
        } catch (error: unknown) {
            const axiosErr = error as { response?: { data?: { detail?: string } } };
            toast.error(axiosErr?.response?.data?.detail || 'Error al asignar');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevo_estado = e.target.value;
        if (nuevo_estado === 'DESCARTADO') {
            setShowDiscardModal(true);
            return;
        }
        try {
            await changeEstado.mutateAsync({ inboxId: selectedConv.inbox_id, nuevo_estado });
            toast.success(`Estado actualizado`);
            onChangeConv({ ...selectedConv, estado: nuevo_estado });
        } catch {
            toast.error('Error al cambiar el estado');
        }
    };

    const handleConvertir = async () => {
        if (onCerrarClick) {
            onCerrarClick();
            return;
        }
        try {
            await changeEstado.mutateAsync({ inboxId: selectedConv.inbox_id, nuevo_estado: 'CIERRE' });
            toast.success('Lead cerrado exitosamente');
            onChangeConv(null);
        } catch {
            toast.error('Error al cerrar el lead');
        }
    };

    const handleRelease = async () => {
        try {
            await releaseChat.mutateAsync(selectedConv.inbox_id);
            toast.success('Chat retornado al bot');
            onChangeConv({ ...selectedConv, modo: 'BOT' });
        } catch {
            toast.error('Error al retornar chat al bot');
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
            await descartarLead.mutateAsync({ inboxId: selectedConv.inbox_id, request: discardData });
            toast.success('Lead descartado');
            setShowDiscardModal(false);
            setDiscardData({ motivo_descarte: '', comentario_descarte: '' });
            onChangeConv(null);
        } catch {
            toast.error('Error al descartar');
        } finally {
            setIsDiscarding(false);
        }
    };

    // Avatar
    const initial = (selectedConv.nombre_whatsapp || selectedConv.telefono).charAt(0).toUpperCase();
    const avatarColors = [
        'from-emerald-400 to-teal-500',
        'from-blue-400 to-indigo-500',
        'from-violet-400 to-purple-500',
        'from-rose-400 to-pink-500',
        'from-amber-400 to-orange-500',
        'from-cyan-400 to-blue-500',
    ];
    const colorIndex = (selectedConv.nombre_whatsapp || selectedConv.telefono).charCodeAt(0) % avatarColors.length;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header con botón cerrar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="font-semibold text-slate-700 text-sm">Información del Lead</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Perfil del contacto */}
            <div className="px-5 py-5 text-center border-b border-slate-100">
                <div className={`
                    w-20 h-20 bg-gradient-to-br ${avatarColors[colorIndex]}
                    rounded-2xl flex items-center justify-center text-white font-bold text-3xl
                    mx-auto mb-3 shadow-lg shadow-slate-200/50
                `}>
                    {initial}
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">
                    {selectedConv.nombre_whatsapp || 'Cliente Nuevo'}
                </h3>
                <p className="text-slate-400 text-sm font-mono mt-1">
                    {selectedConv.telefono}
                </p>

                {/* Modo actual */}
                <div className={`
                    inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold
                    ${selectedConv.modo === 'BOT'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-purple-50 text-purple-600 border border-purple-100'
                    }
                `}>
                    {selectedConv.modo === 'BOT'
                        ? <><Bot size={12} /> Gestionado por Bot</>
                        : <><Headset size={12} /> Gestionado por Asesor</>
                    }
                </div>
            </div>

            {/* Estado del Lead */}
            <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-2.5">
                    <Tag size={14} className="text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Estado del Lead
                    </label>
                </div>
                <select
                    value={selectedConv.estado}
                    onChange={handleEstadoChange}
                    disabled={selectedConv.estado === 'CIERRE' || selectedConv.estado === 'DESCARTADO'}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium
                        focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                    {ESTADOS_MAP.map(est => (
                        <option key={est.value} value={est.value}>{est.label}</option>
                    ))}
                </select>
            </div>

            {/* Asignación manual (solo para leads NUEVO sin asesor) */}
            {(selectedConv.estado === 'NUEVO' || !selectedConv.asignado_a) && (
                <div className="px-5 py-4 border-b border-slate-100 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus size={14} className="text-blue-500" />
                        <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                            Asignar Asesor
                        </label>
                    </div>
                    <p className="text-xs text-slate-400 -mt-1">
                        Este lead no tiene asesor asignado. Selecciona uno manualmente.
                    </p>
                    <select
                        value={selectedComercialId}
                        onChange={(e) => setSelectedComercialId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium
                            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                            transition-all cursor-pointer"
                    >
                        <option value="">-- Selecciona un asesor --</option>
                        {comerciales.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAsignarManual}
                        disabled={!selectedComercialId || isAssigning}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold
                            flex items-center justify-center gap-2 shadow-sm shadow-blue-200 hover:shadow-md transition-all
                            disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus size={15} />
                        {isAssigning ? 'Asignando...' : 'Asignar Asesor'}
                    </button>
                </div>
            )}

            {/* Acciones */}
            <div className="px-5 py-4 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2 mb-1">
                    <ChevronRight size={14} className="text-slate-400" />
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Acciones
                    </label>
                </div>

                {selectedConv.modo === 'ASESOR' && (
                    <button
                        onClick={handleRelease}
                        className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium
                            flex items-center justify-center gap-2 transition-all border border-slate-200 hover:border-slate-300"
                    >
                        <Bot size={15} /> Devolver al Bot
                    </button>
                )}

                <button
                    onClick={handleConvertir}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold
                        flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 hover:shadow-md transition-all"
                >
                    <CheckCircle2 size={15} /> Cerrar como Cliente
                </button>

                <button
                    onClick={() => setShowDiscardModal(true)}
                    className="w-full py-2.5 px-4 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl text-sm font-medium
                        flex items-center justify-center gap-2 transition-all border border-slate-200 hover:border-red-200"
                >
                    Descartar Lead
                </button>
            </div>

            {/* Info CRM */}
            <div className="px-5 py-4 flex-1 overflow-y-auto">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                    Información
                </label>

                <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
                            <Building2 className="text-slate-400" size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Empresa / RUC</p>
                            <p className="text-sm font-medium text-slate-600 mt-0.5">No Registrado</p>
                            <button className="text-emerald-600 text-xs mt-1 hover:underline font-medium">
                                Vincular con Cliente →
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
                            <Phone className="text-slate-400" size={16} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Canal</p>
                            <p className="text-sm font-medium text-slate-600 mt-0.5">WhatsApp Oficial</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl flex gap-3 items-start">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
                            <Clock className="text-slate-400" size={16} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Última actividad</p>
                            <p className="text-sm font-medium text-slate-600 mt-0.5">
                                {selectedConv.ultimo_mensaje_at
                                    ? new Date(selectedConv.ultimo_mensaje_at).toLocaleString('es-PE', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })
                                    : 'Sin actividad'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de descarte */}
            {showDiscardModal && isMounted && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        {/* Header */}
                        <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-red-700">Descartar Lead</h3>
                                <p className="text-xs text-red-400">Esta acción cerrará la conversación</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Motivo de Descarte <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="w-full border-slate-200 rounded-xl shadow-sm focus:border-red-400 focus:ring-red-200 text-sm py-2.5 px-3"
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
                                    className="w-full border-slate-200 rounded-xl shadow-sm focus:border-red-400 focus:ring-red-200 text-sm py-2.5 px-3 resize-none"
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
                                {isDiscarding ? 'Descartando...' : 'Confirmar Descarte'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
