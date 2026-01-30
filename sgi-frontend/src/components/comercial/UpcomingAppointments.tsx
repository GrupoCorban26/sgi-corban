'use client';

import React, { useState } from 'react';
import { useCitas, Cita } from '@/hooks/comercial/useCitas';
import { Calendar, Clock, MapPin, Loader2, Info, User, Filter, CheckCircle } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ModalAprobarCita from '@/components/comercial/ModalAprobarCita';
import { toast } from 'sonner';

export default function UpcomingAppointments() {
    const { user, isJefeComercial, isAdmin } = useCurrentUser();
    const isBoss = isJefeComercial() || isAdmin();

    const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('PENDIENTE');

    // If Boss -> fetch all (comercial_id=undefined)
    // If Commercial -> fetch only theirs (comercial_id=user.id)
    // Wait for user to be loaded
    const comercialIdFilter = isBoss ? undefined : user?.id;

    // We only fetch if user is loaded
    const shouldFetch = !!user;

    const { citas, isLoading, terminateMutation } = useCitas(shouldFetch ? comercialIdFilter : undefined, filterStatus, 1);

    // Sort by date asc (closest first)
    const sortedCitas = [...citas].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const handleCitaClick = (cita: Cita) => {
        if (isBoss && cita.estado === 'PENDIENTE') {
            setSelectedCita(cita);
            setIsApprovalOpen(true);
        }
    };

    const handleTerminate = async (e: React.MouseEvent, citaId: number) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm('¿Confirmar que la cita ha culminado?')) return;

        try {
            await terminateMutation.mutateAsync(citaId);
            toast.success('Cita marcada como terminada');
        } catch (error) {
            toast.error('Error al finalizar cita (Verifique que sea fecha actual)');
        }
    };

    if (!user) return <div className="p-6 h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>;

    const STATUS_OPTIONS = [
        { value: 'PENDIENTE', label: 'Pendientes' },
        { value: 'APROBADO', label: 'Programadas' },
        { value: 'TERMINADO', label: 'Terminadas' },
        { value: 'RECHAZADO', label: 'Rechazadas' },
    ];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col relative">
            <div className="flex flex-col gap-4 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" size={20} />
                        {isBoss ? 'Citas del Equipo' : 'Mis Citas'}
                    </h3>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                                ${filterStatus === opt.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" />
                </div>
            ) : sortedCitas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <Info size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay citas en esta categoría.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {sortedCitas.map((cita) => {
                        const isPendiente = cita.estado === 'PENDIENTE';
                        const isClickable = isBoss && isPendiente;
                        const isToday = isSameDay(parseISO(cita.fecha), new Date());
                        const canTerminate = !isBoss && cita.estado === 'APROBADO' && isToday;

                        return (
                            <div
                                key={cita.id}
                                onClick={() => handleCitaClick(cita)}
                                className={`flex flex-col p-3 rounded-xl border border-gray-100 transition-all bg-indigo-50/20 
                                    ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 active:scale-[0.98]' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-sm text-gray-800 truncate max-w-[180px]" title={cita.cliente_razon_social}>
                                        {cita.cliente_razon_social}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cita.estado === 'APROBADO' ? 'bg-green-100 text-green-700' :
                                            cita.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' :
                                                cita.estado === 'TERMINADO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                                            }`}>
                                            {cita.estado}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-500 space-y-1">
                                    {isBoss && cita.comercial_nombre && (
                                        <div className="flex items-center gap-2 text-indigo-600 font-medium pb-1">
                                            <User size={12} />
                                            <span>{cita.comercial_nombre}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} />
                                        <span>{format(parseISO(cita.fecha), "EEEE d 'de' MMMM", { locale: es })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} />
                                        <span>{cita.hora}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} />
                                        <span className="truncate max-w-[200px]" title={cita.direccion}>
                                            {cita.direccion}
                                        </span>
                                    </div>
                                </div>

                                {cita.conductor_info && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-green-700 font-medium flex items-center gap-1">
                                        🚗 {cita.conductor_info}
                                    </div>
                                )}

                                {canTerminate && (
                                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={(e) => handleTerminate(e, cita.id)}
                                            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            <CheckCircle size={14} />
                                            Terminar Encuentro
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ModalAprobarCita
                isOpen={isApprovalOpen}
                onClose={() => setIsApprovalOpen(false)}
                cita={selectedCita}
            />
        </div>
    );
}
