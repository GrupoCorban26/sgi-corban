'use client';

import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, Loader2, ArrowRight, ClipboardList, AlertTriangle, Users } from 'lucide-react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { useGestiones, GestionCreate } from '@/hooks/comercial/useGestiones';
import { useClientes } from '@/hooks/comercial/useClientes';
import { ClienteMarcarCaido } from '@/types/cliente';
import { toast } from 'sonner';
import ModalContactosCliente from './modal-contactos-cliente';

interface Props {
    clienteId: number;
    clienteNombre: string;
    clienteRuc?: string;
    clienteRazonSocial?: string;
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

// Estados del pipeline con etiquetas legibles, colores y tipo (positivo/negativo)
const ESTADOS_PIPELINE: Record<string, { label: string; color: string; tipo: 'positivo' | 'negativo' }> = {
    PROSPECTO:        { label: 'Prospecto',       color: 'bg-sky-100 text-sky-700 border-sky-300', tipo: 'positivo' },
    EN_NEGOCIACION:   { label: 'En negociación',  color: 'bg-amber-100 text-amber-700 border-amber-300', tipo: 'positivo' },
    CERRADA:          { label: 'Cerrada',         color: 'bg-green-100 text-green-700 border-green-300', tipo: 'positivo' },
    EN_OPERACION:     { label: 'En operación',    color: 'bg-indigo-100 text-indigo-700 border-indigo-300', tipo: 'positivo' },
    CARGA_ENTREGADA:  { label: 'Carga entregada', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', tipo: 'positivo' },
    CAIDO:            { label: 'Caído',           color: 'bg-red-100 text-red-700 border-red-300', tipo: 'negativo' },
    INACTIVO:         { label: 'Inactivo',        color: 'bg-gray-100 text-gray-500 border-gray-300', tipo: 'negativo' },
};

const MOTIVOS_CAIDA = [
    'Precio alto',
    'No responde',
    'Ya no quiere trabajar con nosotros',
    'Otro',
];

// Transiciones válidas (debe coincidir con el backend)
const TRANSICIONES: Record<string, string[]> = {
    PROSPECTO:        ['EN_NEGOCIACION', 'CAIDO', 'INACTIVO'],
    EN_NEGOCIACION:   ['CERRADA', 'CAIDO', 'PROSPECTO'],
    CERRADA:          ['EN_OPERACION', 'CAIDO'],
    EN_OPERACION:     ['CARGA_ENTREGADA'],
    CARGA_ENTREGADA:  ['PROSPECTO', 'EN_NEGOCIACION'],
    CAIDO:            ['PROSPECTO', 'INACTIVO'],
    INACTIVO:         ['PROSPECTO'],
};

export default function ModalRegistrarGestion({
    clienteId, clienteNombre, clienteRuc, clienteRazonSocial, estadoActual, isOpen, onClose
}: Props) {
    const { registrarMutation } = useGestiones(clienteId);
    const { marcarCaidoMutation, archivarMutation } = useClientes();

    const [tipo, setTipo] = useState('LLAMADA');
    const [resultado, setResultado] = useState('');
    const [comentario, setComentario] = useState('');
    const [proximaFecha, setProximaFecha] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState('');

    // Campos para Caído
    const [motivoCaida, setMotivoCaida] = useState('');
    const [motivoCaidaOtro, setMotivoCaidaOtro] = useState('');
    const [fechaSeguimientoCaida, setFechaSeguimientoCaida] = useState('');

    // Modal de contactos
    const [isContactosOpen, setIsContactosOpen] = useState(false);

    // Obtener transiciones posibles desde el estado actual
    const transicionesPosibles = estadoActual ? (TRANSICIONES[estadoActual] || []) : [];
    const estadoActualInfo = estadoActual ? ESTADOS_PIPELINE[estadoActual] : null;

    // Separar transiciones positivas y negativas
    const transicionesPositivas = transicionesPosibles.filter(e => ESTADOS_PIPELINE[e]?.tipo === 'positivo');
    const transicionesNegativas = transicionesPosibles.filter(e => ESTADOS_PIPELINE[e]?.tipo === 'negativo');

    const resetForm = () => {
        setTipo('LLAMADA');
        setResultado('');
        setComentario('');
        setProximaFecha('');
        setNuevoEstado('');
        setMotivoCaida('');
        setMotivoCaidaOtro('');
        setFechaSeguimientoCaida('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultado) return;

        // Si marcó Caído, validar motivo
        if (nuevoEstado === 'CAIDO' && !motivoCaida) {
            toast.error('El motivo de caída es obligatorio');
            return;
        }
        if (nuevoEstado === 'CAIDO' && motivoCaida === 'Otro' && !motivoCaidaOtro.trim()) {
            toast.error('Especifique el motivo de caída');
            return;
        }

        try {
            // Caso especial: Marcar como CAIDO (usa endpoint dedicado)
            if (nuevoEstado === 'CAIDO') {
                const motivoFinal = motivoCaida === 'Otro' ? motivoCaidaOtro.trim() : motivoCaida;
                const caido: ClienteMarcarCaido = {
                    motivo_caida: motivoFinal,
                    fecha_seguimiento_caida: fechaSeguimientoCaida || undefined,
                };
                await marcarCaidoMutation.mutateAsync({ id: clienteId, data: caido });

                // También registrar la gestión
                const gestion: GestionCreate = {
                    tipo,
                    resultado,
                    comentario: comentario || undefined,
                    proxima_fecha_contacto: proximaFecha || undefined,
                };
                await registrarMutation.mutateAsync({ clienteId, gestion });
                toast.success('Cliente marcado como caído y gestión registrada');
            }
            // Caso especial: Archivar (INACTIVO)
            else if (nuevoEstado === 'INACTIVO') {
                await archivarMutation.mutateAsync(clienteId);

                // También registrar la gestión
                const gestion: GestionCreate = {
                    tipo,
                    resultado,
                    comentario: comentario || undefined,
                    proxima_fecha_contacto: proximaFecha || undefined,
                };
                await registrarMutation.mutateAsync({ clienteId, gestion });
                toast.success('Cliente archivado y gestión registrada');
            }
            // Caso normal: registrar gestión con cambio de estado opcional
            else {
                const gestion: GestionCreate = {
                    tipo,
                    resultado,
                    comentario: comentario || undefined,
                    proxima_fecha_contacto: proximaFecha || undefined,
                    nuevo_estado: nuevoEstado || undefined,
                };
                await registrarMutation.mutateAsync({ clienteId, gestion });
                toast.success('Gestión registrada correctamente');
            }

            resetForm();
            onClose();
        } catch (error: unknown) {
            const axiosErr = error as { response?: { data?: { detail?: string } } };
            const message = axiosErr?.response?.data?.detail || 'Error al registrar gestión';
            toast.error(message);
        }
    };

    const isPending = registrarMutation.isPending || marcarCaidoMutation.isPending || archivarMutation.isPending;

    return (
        <>
            <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
                <ModalHeader
                    icon={<ClipboardList size={20} className="text-blue-600" />}
                    title="Registrar Gestión"
                />

                {/* Subtitle */}
                <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <p className="text-sm text-blue-700 truncate">{clienteNombre}</p>
                    {estadoActualInfo && (
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${estadoActualInfo.color}`}>
                            {estadoActualInfo.label}
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[65vh]">
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
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs cursor-pointer
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
                                    className={`p-2 rounded-lg border-2 text-left text-sm transition-all cursor-pointer
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

                            {/* Indicador visual del cambio */}
                            {nuevoEstado && (
                                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                                    <span className={`text-xs px-2 py-1 rounded-lg border ${estadoActualInfo?.color || 'bg-gray-100'}`}>
                                        {estadoActualInfo?.label || estadoActual}
                                    </span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className={`text-xs px-2 py-1 rounded-lg border ${ESTADOS_PIPELINE[nuevoEstado]?.color || 'bg-gray-100'}`}>
                                        {ESTADOS_PIPELINE[nuevoEstado]?.label || nuevoEstado}
                                    </span>
                                </div>
                            )}

                            {/* Transiciones positivas (avanzar/retroceder pipeline) */}
                            {transicionesPositivas.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {transicionesPositivas.map(estado => {
                                        const info = ESTADOS_PIPELINE[estado];
                                        if (!info) return null;
                                        return (
                                            <button
                                                key={estado}
                                                type="button"
                                                onClick={() => setNuevoEstado(nuevoEstado === estado ? '' : estado)}
                                                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer
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
                            )}

                            {/* Transiciones negativas (caído / inactivo) — separadas visualmente */}
                            {transicionesNegativas.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                    {transicionesNegativas.map(estado => {
                                        const info = ESTADOS_PIPELINE[estado];
                                        if (!info) return null;
                                        return (
                                            <button
                                                key={estado}
                                                type="button"
                                                onClick={() => setNuevoEstado(nuevoEstado === estado ? '' : estado)}
                                                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer
                                                    ${nuevoEstado === estado
                                                        ? `${info.color} border-current ring-2 ring-offset-1 ring-red-300`
                                                        : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'
                                                    }`}
                                            >
                                                {info.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Campos condicionales para CAIDO */}
                    {nuevoEstado === 'CAIDO' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                                <AlertTriangle size={16} />
                                Marcar como caído
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-red-700 mb-1">Motivo de caída *</label>
                                <select
                                    value={motivoCaida}
                                    onChange={e => setMotivoCaida(e.target.value)}
                                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white"
                                    required
                                >
                                    <option value="">Seleccione un motivo...</option>
                                    {MOTIVOS_CAIDA.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                {motivoCaida === 'Otro' && (
                                    <input
                                        type="text"
                                        value={motivoCaidaOtro}
                                        onChange={e => setMotivoCaidaOtro(e.target.value)}
                                        placeholder="Especifique el motivo..."
                                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 mt-2"
                                        required
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-red-700 mb-1">
                                    Fecha de seguimiento <span className="text-red-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={fechaSeguimientoCaida}
                                    onChange={e => setFechaSeguimientoCaida(e.target.value)}
                                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400"
                                />
                                <p className="text-xs text-red-400 mt-1">Si no se indica fecha, se archivará como inactivo</p>
                            </div>
                        </div>
                    )}

                    {/* Confirmación para INACTIVO */}
                    {nuevoEstado === 'INACTIVO' && (
                        <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mb-1">
                                <AlertTriangle size={16} />
                                Archivar cliente
                            </div>
                            <p className="text-xs text-gray-500">
                                El cliente será marcado como inactivo y se desactivarán sus contactos. Esta acción se puede revertir reactivando al cliente.
                            </p>
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

                    {/* Footer con botón de contactos + submit */}
                    <ModalFooter>
                        <button
                            type="button"
                            onClick={() => setIsContactosOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            title="Gestionar contactos"
                        >
                            <Users size={16} />
                            Contactos
                        </button>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={() => { resetForm(); onClose(); }}
                            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!resultado || isPending}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Registrar'
                            )}
                        </button>
                    </ModalFooter>
                </form>
            </ModalBase>

            {/* Modal de contactos (se abre desde dentro) */}
            <ModalContactosCliente
                isOpen={isContactosOpen}
                onClose={() => setIsContactosOpen(false)}
                ruc={clienteRuc || ''}
                razonSocial={clienteRazonSocial || clienteNombre}
            />
        </>
    );
}
