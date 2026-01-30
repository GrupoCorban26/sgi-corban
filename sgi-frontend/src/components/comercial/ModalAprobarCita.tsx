'use client';

import React, { useState } from 'react';
import { CheckCircle, Car, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCitas, useConductores, Cita } from '@/hooks/comercial/useCitas';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

// MOCK Users hook - in real app fetch actual users
const useUsuarios = () => {
    // Return dummy list or fetch from API if exists 
    // We will hardcode for now to avoid blocking if hook missing
    return [
        { id: 1, nombre: 'Aranza (Jefa)' },
        { id: 2, nombre: 'Isrrael (Comercial)' },
        { id: 3, nombre: 'Otro Comercial' }
    ];
};

interface ModalAprobarCitaProps {
    isOpen: boolean;
    onClose: () => void;
    cita: Cita | null;
}

export default function ModalAprobarCita({ isOpen, onClose, cita }: ModalAprobarCitaProps) {
    const { approveMutation } = useCitas();
    const { data: conductores } = useConductores();
    const usuarios = useUsuarios();

    const [conductorId, setConductorId] = useState<number>(0);
    const [acompananteId, setAcompananteId] = useState<number>(0);

    const handleApprove = async () => {
        if (!cita) return;
        if (!conductorId) return toast.error('Debe asignar un transporte');

        try {
            await approveMutation.mutateAsync({
                id: cita.id,
                data: {
                    conductor_id: conductorId,
                    acompanado_por_id: acompananteId || undefined
                }
            });
            toast.success('Cita aprobada y recursos asignados');
            onClose();
        } catch (error) {
            toast.error('Error al aprobar cita');
        }
    };

    if (!cita) return null;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={<CheckCircle className="text-green-600" />}
                title="Aprobar Solicitud de Cita"
            />

            <div className="p-6 space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                    <p className="font-semibold text-gray-800">{cita.cliente_razon_social}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                        <span>📅 {new Date(cita.fecha).toLocaleDateString()}</span>
                        <span>⏰ {cita.hora}</span>
                    </div>
                    <p className="text-sm text-gray-500 italic">"{cita.motivo}"</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Car size={18} className="text-indigo-600" />
                            Transporte / Vehículo
                        </label>
                        <select
                            className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={conductorId}
                            onChange={(e) => setConductorId(Number(e.target.value))}
                        >
                            <option value={0}>-- Seleccionar Transporte --</option>
                            {conductores?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display_label} - ({c.placa})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 pl-1">
                            Seleccione el conductor y vehículo asignado.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <UserPlus size={18} className="text-indigo-600" />
                            Acompañante (Opcional)
                        </label>
                        <select
                            className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={acompananteId}
                            onChange={(e) => setAcompananteId(Number(e.target.value))}
                        >
                            <option value={0}>-- Sin Acompañante --</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <ModalFooter>
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium text-gray-700">
                    Cancelar
                </button>
                <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-200 flex items-center gap-2"
                >
                    {approveMutation.isPending && <Loader2 className="animate-spin" size={18} />}
                    Confirmar Aprobación
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
