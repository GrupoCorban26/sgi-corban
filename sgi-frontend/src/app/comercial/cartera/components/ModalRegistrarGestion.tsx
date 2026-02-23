'use client';

import React, { useState } from 'react';
import { X, Phone, Mail, MessageSquare, MapPin, FileText, Loader2 } from 'lucide-react';
import { useGestiones, GestionCreate } from '@/hooks/comercial/useGestiones';

interface Props {
    clienteId: number;
    clienteNombre: string;
    isOpen: boolean;
    onClose: () => void;
}

const TIPOS_GESTION = [
    { value: 'LLAMADA', label: 'Llamada', icon: Phone },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
    { value: 'VISITA', label: 'Visita', icon: MapPin },
    { value: 'OTRO', label: 'Otro', icon: FileText },
];

const RESULTADOS = [
    { value: 'CONTESTO', label: '✅ Contestó' },
    { value: 'NO_CONTESTO', label: '❌ No contestó' },
    { value: 'INTERESADO', label: '🟢 Interesado' },
    { value: 'COTIZACION_ENVIADA', label: '📄 Cotización enviada' },
    { value: 'NO_LE_INTERESA', label: '🔴 No le interesa' },
    { value: 'LLAMAR_DESPUES', label: '🕐 Llamar después' },
];

export default function ModalRegistrarGestion({ clienteId, clienteNombre, isOpen, onClose }: Props) {
    const { registrarMutation } = useGestiones(clienteId);

    const [tipo, setTipo] = useState('LLAMADA');
    const [resultado, setResultado] = useState('');
    const [comentario, setComentario] = useState('');
    const [proximaFecha, setProximaFecha] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultado) return;

        const gestion: GestionCreate = {
            tipo,
            resultado,
            comentario: comentario || undefined,
            proxima_fecha_contacto: proximaFecha || undefined,
        };

        await registrarMutation.mutateAsync({ clienteId, gestion });
        // Reset y cerrar
        setTipo('LLAMADA');
        setResultado('');
        setComentario('');
        setProximaFecha('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Registrar Gestión</h3>
                        <p className="text-blue-100 text-sm truncate">{clienteNombre}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Tipo de Gestión */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de gestión</label>
                        <div className="grid grid-cols-5 gap-2">
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

                    {/* Resultado */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resultado *</label>
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

                    {/* Comentario */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                        <textarea
                            value={comentario}
                            onChange={e => setComentario(e.target.value)}
                            placeholder="Ej: Dice que lo llamemos el lunes..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!resultado || registrarMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                </form>
            </div>
        </div>
    );
}
