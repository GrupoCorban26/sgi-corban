'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Car, UserPlus, User, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useCitas, useConductores, Cita, useComercialesDropdown } from '@/hooks/comercial/useCitas';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

interface ModalAprobarCitaProps {
    isOpen: boolean;
    onClose: () => void;
    cita: Cita | null;
}

export default function ModalAprobarCita({ isOpen, onClose, cita }: ModalAprobarCitaProps) {
    const { approveMutation, rejectMutation } = useCitas();
    const { data: conductores } = useConductores();
    const { data: comerciales } = useComercialesDropdown();

    const [conductorId, setConductorId] = useState<number>(0);
    const [acompananteId, setAcompananteId] = useState<number>(0);
    const [iraSolo, setIraSolo] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [modoRechazo, setModoRechazo] = useState(false);

    const handleApprove = async () => {
        if (!cita) return;

        try {
            await approveMutation.mutateAsync({
                id: cita.id,
                data: {
                    acompanado_por_id: iraSolo ? undefined : (acompananteId || undefined),
                    ira_solo: iraSolo,
                    conductor_id: conductorId || undefined
                }
            });
            toast.success('Cita aprobada correctamente');
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al aprobar cita');
        }
    };

    const handleReject = async () => {
        if (!cita) return;
        if (!motivoRechazo.trim()) {
            return toast.error('Debe especificar el motivo del rechazo');
        }

        try {
            await rejectMutation.mutateAsync({
                id: cita.id,
                data: { motivo_rechazo: motivoRechazo }
            });
            toast.success('Cita rechazada');
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al rechazar cita');
        }
    };

    if (!cita) return null;

    const isPending = approveMutation.isPending || rejectMutation.isPending;

    // Mostrar comerciales asignados para salidas a campo
    if (cita.tipo_agenda === 'SALIDA_CAMPO') {
        return (
            <ModalBase isOpen={isOpen} onClose={onClose}>
                <ModalHeader
                    icon={<CheckCircle className="text-emerald-600" />}
                    title="Detalle de Salida a Campo"
                />

                <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 p-4 rounded-xl space-y-2">
                        <p className="font-semibold text-emerald-800">Salida a Campo</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                            <span>📅 {new Date(cita.fecha).toLocaleDateString()}</span>
                            <span>⏰ {cita.hora}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                            <strong>Objetivo:</strong> {cita.objetivo_campo || cita.motivo}
                        </p>
                        {cita.direccion && (
                            <p className="text-sm text-gray-600">
                                <strong>Zona:</strong> {cita.direccion}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Comerciales Asignados:</h4>
                        <div className="flex flex-wrap gap-2">
                            {cita.comerciales_asignados?.map((c) => (
                                <span
                                    key={c.id}
                                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                >
                                    {c.nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <ModalFooter>
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-medium text-gray-700">
                        Cerrar
                    </button>
                </ModalFooter>
            </ModalBase>
        );
    }

    // Modal para citas individuales
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={modoRechazo ? <XCircle className="text-red-600" /> : <CheckCircle className="text-green-600" />}
                title={modoRechazo ? 'Rechazar Cita' : 'Aprobar Solicitud de Cita'}
            />

            <div className="p-6 space-y-6">
                {/* Resumen de la cita */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                    <p className="font-semibold text-gray-800">{cita.cliente_razon_social}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                        <span>📅 {new Date(cita.fecha).toLocaleDateString()}</span>
                        <span>⏰ {cita.hora}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        <strong>Tipo:</strong> {cita.tipo_cita === 'VISITA_CLIENTE' ? 'Visitará al cliente' : 'Cliente vendrá a oficina'}
                    </p>
                    <p className="text-sm text-gray-500 italic">"{cita.motivo}"</p>
                    {cita.con_presente && (
                        <span className="inline-flex items-center gap-1 text-xs text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
                            🎁 Llevará regalo
                        </span>
                    )}
                </div>

                {!modoRechazo ? (
                    /* Modo Aprobación */
                    <div className="space-y-4">
                        {/* Checkbox irá solo */}
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                            <input
                                type="checkbox"
                                id="iraSolo"
                                checked={iraSolo}
                                onChange={(e) => {
                                    setIraSolo(e.target.checked);
                                    if (e.target.checked) setAcompananteId(0);
                                }}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                            <label htmlFor="iraSolo" className="flex items-center gap-2 text-sm font-medium text-blue-800 cursor-pointer">
                                <User size={18} />
                                Irá solo (sin acompañante)
                            </label>
                        </div>

                        {/* Acompañante (si no irá solo) */}
                        {!iraSolo && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <UserPlus size={18} className="text-indigo-600" />
                                    Acompañante
                                </label>
                                <select
                                    className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={acompananteId}
                                    onChange={(e) => setAcompananteId(Number(e.target.value))}
                                >
                                    <option value={0}>-- Seleccionar Acompañante --</option>
                                    {comerciales?.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Transporte (opcional) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Car size={18} className="text-gray-500" />
                                Transporte (Opcional)
                            </label>
                            <select
                                className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={conductorId}
                                onChange={(e) => setConductorId(Number(e.target.value))}
                            >
                                <option value={0}>-- Sin transporte asignado --</option>
                                {conductores?.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.display_label} - ({c.placa})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 pl-1">
                                El transporte es opcional. Déjelo vacío si usará el transporte habitual.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Modo Rechazo */
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-red-700">
                            <MessageSquare size={18} />
                            Motivo del Rechazo *
                        </label>
                        <textarea
                            className="w-full p-3 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400"
                            rows={4}
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            placeholder="Explique por qué se rechaza esta solicitud..."
                        />
                    </div>
                )}
            </div>

            <ModalFooter>
                {!modoRechazo ? (
                    <>
                        <button
                            onClick={() => setModoRechazo(true)}
                            className="px-5 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 font-medium text-red-600"
                        >
                            Rechazar
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-200 flex items-center gap-2"
                        >
                            {isPending && <Loader2 className="animate-spin" size={18} />}
                            Aprobar Cita
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setModoRechazo(false)}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium text-gray-700"
                        >
                            Volver
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2"
                        >
                            {isPending && <Loader2 className="animate-spin" size={18} />}
                            Confirmar Rechazo
                        </button>
                    </>
                )}
            </ModalFooter>
        </ModalBase>
    );
}
