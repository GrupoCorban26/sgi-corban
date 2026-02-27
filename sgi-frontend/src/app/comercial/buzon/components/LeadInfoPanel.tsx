import React from 'react';
import { ChatConversationPreview } from '@/types/chat';
import { useChatActions } from '@/hooks/comercial/useChat';
import { Building2, Phone, Calendar, Repeat, UserPlus, CheckCircle2, Bot, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    selectedConv: ChatConversationPreview;
    onChangeConv: (conv: ChatConversationPreview | null) => void;
}

const ESTADOS_MAP = [
    { value: 'NUEVO', label: 'Nuevo Lead' },
    { value: 'PENDIENTE', label: 'Pendiente de Atención' },
    { value: 'EN_GESTION', label: 'En Gestión Activa' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento / Espera' },
    { value: 'COTIZADO', label: 'Cotización Enviada' },
];

export default function LeadInfoPanel({ selectedConv, onChangeConv, onCerrarClick }: Props & { onCerrarClick?: () => void }) {
    const { changeEstado, releaseChat, descartarLead } = useChatActions();
    const [showDiscardModal, setShowDiscardModal] = React.useState(false);
    const [discardData, setDiscardData] = React.useState({ motivo_descarte: '', comentario_descarte: '' });
    const [isDiscarding, setIsDiscarding] = React.useState(false);

    const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevo_estado = e.target.value;
        if (nuevo_estado === 'DESCARTADO') {
            setShowDiscardModal(true);
            return;
        }

        try {
            await changeEstado.mutateAsync({ inboxId: selectedConv.inbox_id, nuevo_estado });
            toast.success(`Estado cambiado a ${nuevo_estado.replace('_', ' ')}`);
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
            onChangeConv(null); // Close panel or handle as closed
        } catch {
            toast.error('Error al cerrar el lead');
        }
    };

    const handleDescartarClick = () => {
        setShowDiscardModal(true);
    };

    const confirmDescartar = async () => {
        if (!discardData.motivo_descarte) {
            toast.error('Debe seleccionar un motivo de descarte');
            return;
        }
        if (!discardData.comentario_descarte.trim()) {
            toast.error('Debe ingresar un comentario obligatorio');
            return;
        }

        setIsDiscarding(true);
        try {
            await descartarLead.mutateAsync({
                inboxId: selectedConv.inbox_id,
                request: discardData
            });
            toast.success('Lead descartado');
            setShowDiscardModal(false);
            setDiscardData({ motivo_descarte: '', comentario_descarte: '' });
            onChangeConv(null);
        } catch {
            toast.error('Error al descartar el lead');
        } finally {
            setIsDiscarding(false);
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

    return (
        <div className="flex flex-col h-full bg-white divide-y divide-gray-100">
            {/* Header Client Name */}
            <div className="p-5 bg-gray-50/50">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-3xl mx-auto mb-3">
                    {selectedConv.nombre_whatsapp?.charAt(0).toUpperCase() || selectedConv.telefono.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-800 text-lg text-center leading-tight">
                    {selectedConv.nombre_whatsapp || 'Cliente Nuevo'}
                </h3>
                <p className="text-gray-500 text-sm text-center font-mono mt-1">
                    {selectedConv.telefono}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Estado del Lead
                    </label>
                    <select
                        value={selectedConv.estado}
                        onChange={handleEstadoChange}
                        disabled={selectedConv.estado === 'CIERRE' || selectedConv.estado === 'DESCARTADO'}
                        className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {ESTADOS_MAP.map(est => (
                            <option key={est.value} value={est.value}>{est.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="p-5 flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Acciones
                </h4>

                {selectedConv.modo === 'ASESOR' ? (
                    <button
                        onClick={handleRelease}
                        className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-200"
                    >
                        <Bot size={16} /> Devolver al Bot
                    </button>
                ) : (
                    <button
                        className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-blue-200"
                        title="El bot está gestionando actualmente"
                    >
                        <Repeat size={16} /> Reactivar 48h (Auto)
                    </button>
                )}

                <button
                    onClick={handleConvertir}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
                >
                    <CheckCircle2 size={16} /> Cerrar como Cliente
                </button>

                <button
                    onClick={handleDescartarClick}
                    className="w-full py-2.5 px-4 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-200 hover:border-red-200"
                >
                    Descartar Lead
                </button>
            </div>

            {/* Info Tab */}
            <div className="p-5 flex-1 overflow-y-auto bg-gray-50/30">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Información Crm
                </h4>

                <div className="space-y-4">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                        <Building2 className="text-gray-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs text-gray-500">Empresa / RUC</p>
                            <p className="text-sm font-medium text-gray-800">No Registrado</p>
                            <button className="text-emerald-600 text-xs mt-1 hover:underline">Vincular con Cliente</button>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                        <Phone className="text-gray-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs text-gray-500">Canal de Ingreso</p>
                            <p className="text-sm font-medium text-gray-800">WhatsApp Oficial</p>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                        <Calendar className="text-gray-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs text-gray-500">Última Actividad</p>
                            <p className="text-sm font-medium text-gray-800">
                                {selectedConv.ultimo_mensaje_at ? new Date(selectedConv.ultimo_mensaje_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Discard Modal */}
            {showDiscardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Descartar Lead</h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            Estás a punto de descartar el contacto actual. Por favor, indica el motivo y proporciona un comentario breve de por qué se descarta.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Descarte *</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500 text-sm py-2 px-3"
                                    value={discardData.motivo_descarte}
                                    onChange={(e) => setDiscardData({ ...discardData, motivo_descarte: e.target.value })}
                                >
                                    <option value="">-- Selecciona un motivo --</option>
                                    <option value="Solo consulta">Solo consulta</option>
                                    <option value="No realizamos su requerimiento">No realizamos su requerimiento</option>
                                    <option value="No responde">No responde</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario / Detalle *</label>
                                <textarea
                                    rows={3}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500 text-sm py-2 px-3 resize-none"
                                    placeholder="Ej: Cliente solo preguntaba por precios referencia, no importará pronto..."
                                    value={discardData.comentario_descarte}
                                    onChange={(e) => setDiscardData({ ...discardData, comentario_descarte: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowDiscardModal(false);
                                    setDiscardData({ motivo_descarte: '', comentario_descarte: '' });
                                }}
                                disabled={isDiscarding}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDescartar}
                                disabled={isDiscarding}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                            >
                                {isDiscarding ? 'Guardando...' : 'Descartar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
