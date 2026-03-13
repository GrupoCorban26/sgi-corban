'use client';

import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, Loader2, ArrowRight, ClipboardList } from 'lucide-react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { useGestiones, GestionCreate } from '@/hooks/comercial/useGestiones';

interface Props {
    clienteId: number;
    clienteNombre: string;
    estadoActual?: string;
    isOpen: boolean;
    onClose: () => void;
}

const TIPOS_GESTION = [
    { value: 'LLAMADA', label: 'Llamada', icon: Phone },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
];

const RESULTADOS = [
    { value: 'SEGUIMIENTO_CARGA', label: '📦 Seguimiento de carga' },
    { value: 'FIDELIZACION', label: '🤝 Fidelización' },
    { value: 'DUDAS_CLIENTE', label: '❓ Dudas del cliente' },
    { value: 'QUIERE_COTIZACION', label: '📄 Quiere cotización' },
];

// Estados del pipeline con etiquetas legibles y colores
const ESTADOS_PIPELINE: Record<string, { label: string; color: string }> = {
    PROSPECTO: { label: 'Prospecto', color: 'bg-sky-100 text-sky-700 border-sky-300' },
    EN_NEGOCIACION: { label: 'En negociación', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    CERRADA: { label: 'Cerrada', color: 'bg-green-100 text-green-700 border-green-300' },
    EN_OPERACION: { label: 'En operación', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
};

// Transiciones válidas (debe coincidir con el backend)
const TRANSICIONES: Record<string, string[]> = {
    PROSPECTO: ['EN_NEGOCIACION'],
    EN_NEGOCIACION: ['CERRADA', 'PROSPECTO'],
    CERRADA: ['EN_OPERACION'],
    EN_OPERACION: ['EN_NEGOCIACION'],
};

export default function ModalRegistrarGestion({ clienteId, clienteNombre, estadoActual, isOpen, onClose }: Props) {
    const { registrarMutation } = useGestiones(clienteId);

    const [tipo, setTipo] = useState('LLAMADA');
    const [resultado, setResultado] = useState('');
    const [comentario, setComentario] = useState('');
    const [proximaFecha, setProximaFecha] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState('');

    // Obtener transiciones posibles desde el estado actual
    const transicionesPosibles = estadoActual ? (TRANSICIONES[estadoActual] || []) : [];
    const estadoActualInfo = estadoActual ? ESTADOS_PIPELINE[estadoActual] : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultado) return;

        const gestion: GestionCreate = {
            tipo,
            resultado,
            comentario: comentario || undefined,
            proxima_fecha_contacto: proximaFecha || undefined,
            nuevo_estado: nuevoEstado || undefined,
        };

        await registrarMutation.mutateAsync({ clienteId, gestion });
        // Reset y cerrar
        setTipo('LLAMADA');
        setResultado('');
        setComentario('');
        setProximaFecha('');
        setNuevoEstado('');
        onClose();
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                icon={<ClipboardList size={20} className="text-blue-600" />}
                title="Registrar Gestión"
            />

            {/* Subtitle */}
            <div className="px-5 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-700 truncate">{clienteNombre}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
                {/* Tipo de Gestión */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de gestión</label>
                    <div className="grid grid-cols-3 gap-2">
                        {TIPOS_GESTION.map(t => {
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTipo(t.value)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs
                      ${tipo === t.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Motivo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
                    <div className="grid grid-cols-2 gap-2">
                        {RESULTADOS.map(r => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setResultado(r.value)}
                                className={`p-2 rounded-lg border-2 text-left text-sm transition-all
                    ${resultado === r.value
                                        ? 'border-blue-500 bg-blue-50 font-medium'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cambiar Estado del Cliente */}
                {estadoActual && transicionesPosibles.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cambiar estado <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-lg border ${estadoActualInfo?.color || 'bg-gray-100'}`}>
                                {estadoActualInfo?.label || estadoActual}
                            </span>
                            {nuevoEstado && (
                                <>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className={`text-xs px-2 py-1 rounded-lg border ${ESTADOS_PIPELINE[nuevoEstado]?.color || 'bg-gray-100'}`}>
                                        {ESTADOS_PIPELINE[nuevoEstado]?.label || nuevoEstado}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {transicionesPosibles.map(estado => {
                                const info = ESTADOS_PIPELINE[estado];
                                if (!info) return null;
                                return (
                                    <button
                                        key={estado}
                                        type="button"
                                        onClick={() => setNuevoEstado(nuevoEstado === estado ? '' : estado)}
                                        className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all
                                            ${nuevoEstado === estado
                                                ? `${info.color} border-current ring-2 ring-offset-1 ring-blue-300`
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {info.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Comentario */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                    <textarea
                        value={comentario}
                        onChange={e => setComentario(e.target.value)}
                        placeholder="Ej: Dice que lo llamemos el lunes..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={2}
                    />
                </div>

                {/* Próxima fecha de contacto */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Próxima fecha de contacto</label>
                    <input
                        type="date"
                        value={proximaFecha}
                        onChange={e => setProximaFecha(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Submit */}
                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!resultado || registrarMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        {registrarMutation.isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            'Registrar Gestión'
                        )}
                    </button>
                </ModalFooter>
            </form>
        </ModalBase>
    );
}
