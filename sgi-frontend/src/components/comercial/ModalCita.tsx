'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, FileText, Gift, Building2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCitas, Cita, CitaCreate, CitaUpdate } from '@/hooks/comercial/useCitas';
import { useClientes } from '@/hooks/comercial/useClientes';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

interface ModalCitaProps {
    isOpen: boolean;
    onClose: () => void;
    citaToEdit?: Cita | null;
}

export default function ModalCita({ isOpen, onClose, citaToEdit }: ModalCitaProps) {
    const { createMutation, updateMutation } = useCitas();
    const { clientes } = useClientes('', 'CLIENTE', null, 1, 100);
    // Assuming useClientes might need a specific dropdown mode or we just filter list. 
    // Let's check useClientes implementation if possible, or use the one we saw earlier.
    // Earlier 'useClientes' returned 'clientes' array. We'll assume it works.

    const [clienteId, setClienteId] = useState<number>(0);
    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [tipoCita, setTipoCita] = useState('VISITA_CLIENTE');
    const [direccion, setDireccion] = useState('');
    const [motivo, setMotivo] = useState('');
    const [conPresente, setConPresente] = useState(false);

    // Derived state for dropdown
    const [filteredClientes, setFilteredClientes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (citaToEdit) {
            setClienteId(citaToEdit.cliente_id ?? 0);
            // Format fecha to YYYY-MM-DD
            setFecha(citaToEdit.fecha.split('T')[0]);
            setHora(citaToEdit.hora);
            setTipoCita(citaToEdit.tipo_cita);
            setDireccion(citaToEdit.direccion);
            setMotivo(citaToEdit.motivo);
            setConPresente(citaToEdit.con_presente);
            setSearchTerm(citaToEdit.cliente_razon_social || '');
        } else {
            resetForm();
        }
    }, [citaToEdit, isOpen]);

    const resetForm = () => {
        setClienteId(0);
        setFecha('');
        setHora('');
        setTipoCita('VISITA_CLIENTE');
        setDireccion('');
        setMotivo('');
        setConPresente(false);
        setSearchTerm('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clienteId) return toast.error('Seleccione un cliente');
        if (!fecha || !hora) return toast.error('Defina fecha y hora');

        if (!motivo) return toast.error('Ingrese motivo');

        try {
            if (citaToEdit) {
                const updateData: CitaUpdate = {
                    fecha, hora, tipo_cita: tipoCita, direccion, motivo, con_presente: conPresente
                };
                await updateMutation.mutateAsync({ id: citaToEdit.id, data: updateData });
                toast.success('Cita actualizada (Enviada a aprobación)');
            } else {
                const newCita: CitaCreate = {
                    cliente_id: clienteId,
                    fecha, hora, tipo_cita: tipoCita, direccion, motivo, con_presente: conPresente
                };
                await createMutation.mutateAsync(newCita);
                toast.success('Cita agendada correctamente');
            }
            onClose();
        } catch (error) {
            toast.error('Error al guardar cita');
        }
    };

    // Simple autocomplete logic
    // NOTE: Ideally this uses a dedicated async select component
    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        if (clientes) {
            const matches = clientes.filter((c: any) =>
                c.razon_social.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setFilteredClientes(matches);
        }
    }

    const selectCliente = (c: any) => {
        setClienteId(c.id);
        setSearchTerm(c.razon_social);
        setFilteredClientes([]);
    }

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={<Calendar className="text-indigo-600" />}
                title={citaToEdit ? 'Reprogramar / Editar Cita' : 'Agendar Nueva Cita'}
            />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Cliente Autocomplete */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                        placeholder="Buscar cliente..."
                        disabled={!!citaToEdit} // Disable client change on edit? Usually safer.
                    />
                    {filteredClientes.length > 0 && !citaToEdit && (
                        <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 overflow-hidden">
                            {filteredClientes.map(c => (
                                <div
                                    key={c.id}
                                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                    onClick={() => selectCliente(c)}
                                >
                                    {c.razon_social}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Hora</label>
                        <input
                            type="time"
                            value={hora}
                            onChange={(e) => setHora(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                    <select
                        value={tipoCita}
                        onChange={(e) => setTipoCita(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-white"
                    >
                        <option value="VISITA_CLIENTE">Visita al Cliente</option>
                        <option value="VISITA_OFICINA">Visita a Oficina (Cliente viene)</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Dirección</label>
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-xl"
                            placeholder="Dirección del encuentro"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                        rows={3}
                        placeholder="Objetivo de la cita..."
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="conPresente"
                        checked={conPresente}
                        onChange={(e) => setConPresente(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="conPresente" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
                        <Gift size={16} className="text-pink-500" />
                        Llevar presente/obsequio
                    </label>
                </div>
            </form>

            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                    {citaToEdit ? 'Guardar Cambios' : 'Agendar Cita'}
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
