'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, FileText, Gift, Building2, Save, X, Loader2, ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useCitas, Cita, CitaCreate, CitaUpdate } from '@/hooks/comercial/useCitas';
import { useClientes } from '@/hooks/comercial/useClientes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

interface ModalCitaProps {
    isOpen: boolean;
    onClose: () => void;
    citaToEdit?: Cita | null;
}

export default function ModalCita({ isOpen, onClose, citaToEdit }: ModalCitaProps) {
    const { createMutation, updateMutation } = useCitas();
    const { user } = useCurrentUser();
    const { clientes, isLoading: loadingClientes } = useClientes('', null, user?.id ?? null, 1, 100);

    const [clienteId, setClienteId] = useState<number>(0);
    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [tipoCita, setTipoCita] = useState('VISITA_CLIENTE');
    const [direccion, setDireccion] = useState('');
    const [motivo, setMotivo] = useState('');
    const [conPresente, setConPresente] = useState(false);

    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search when dropdown opens
    useEffect(() => {
        if (dropdownOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [dropdownOpen]);

    useEffect(() => {
        if (citaToEdit) {
            setClienteId(citaToEdit.cliente_id ?? 0);
            setFecha(citaToEdit.fecha.split('T')[0]);
            setHora(citaToEdit.hora);
            setTipoCita(citaToEdit.tipo_cita);
            setDireccion(citaToEdit.direccion);
            setMotivo(citaToEdit.motivo);
            setConPresente(citaToEdit.con_presente);
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

    // Filtered list for search
    const filteredClientes = clientes?.filter((c: any) =>
        c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Selected client label
    const selectedCliente = clientes?.find((c: any) => c.id === clienteId);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={<Calendar className="text-indigo-600" />}
                title={citaToEdit ? 'Reprogramar / Editar Cita' : 'Agendar Nueva Cita'}
            />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Cliente Dropdown */}
                <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                    <button
                        type="button"
                        onClick={() => !citaToEdit && setDropdownOpen(!dropdownOpen)}
                        disabled={!!citaToEdit}
                        className={`w-full px-3 py-2.5 border rounded-xl flex items-center justify-between text-left transition-all
                            ${dropdownOpen ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}
                            ${citaToEdit ? 'bg-gray-50 cursor-not-allowed opacity-70' : 'bg-white cursor-pointer'}`}
                    >
                        <span className={`text-sm truncate ${clienteId ? 'text-gray-800' : 'text-gray-400'}`}>
                            {loadingClientes
                                ? 'Cargando clientes...'
                                : selectedCliente
                                    ? selectedCliente.razon_social
                                    : 'Seleccionar cliente...'
                            }
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Search */}
                            <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Buscar cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-100 rounded-lg focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                                    />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="max-h-48 overflow-y-auto">
                                {filteredClientes.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                        {searchTerm ? 'Sin resultados' : 'No hay clientes en tu cartera'}
                                    </div>
                                ) : (
                                    filteredClientes.map((c: any) => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                setClienteId(c.id);
                                                setDropdownOpen(false);
                                                setSearchTerm('');
                                            }}
                                            className={`px-4 py-2.5 cursor-pointer text-sm transition-colors flex items-center gap-2
                                                ${c.id === clienteId
                                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Building2 size={14} className={c.id === clienteId ? 'text-indigo-500' : 'text-gray-300'} />
                                            {c.razon_social}
                                        </div>
                                    ))
                                )}
                            </div>
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
