'use client';

import React, { useState } from 'react';
import { useCitas, Cita } from '@/hooks/comercial/useCitas';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, Search } from 'lucide-react';
import ModalCita from '@/components/comercial/ModalCita';
import ModalAprobarCita from '@/components/comercial/ModalAprobarCita';
import { toast } from 'sonner';

export default function CitasPage() {
    const [activeTab, setActiveTab] = useState<'MIS_CITAS' | 'APROBACION'>('MIS_CITAS');

    // Fetch MIS CITAS (Assuming backend filters by current user default if comercial_id not sent, or we send it)
    // For now we fetch ALL and filter in frontend for prototype, but ideally distinct endpoints/params
    // Param: role logic missing in frontend to detect if I'm "Jefa". Assuming "APROBACION" tab visible based on role.

    // Let's assume we see everything for now to demonstrate functionality
    const { citas, isLoading, rejectMutation } = useCitas(undefined, undefined, 1);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [citaToEdit, setCitaToEdit] = useState<Cita | null>(null);

    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [citaToApprove, setCitaToApprove] = useState<Cita | null>(null);

    // Módulos de filtrado simple
    const misCitas = citas; // Filter by 'created_by' == me in real app
    const pendientesAprobacion = citas.filter((c: Cita) => c.estado === 'PENDIENTE');

    const handleEdit = (cita: Cita) => {
        setCitaToEdit(cita);
        setIsCreateOpen(true);
    };

    const handleApproveClick = (cita: Cita) => {
        setCitaToApprove(cita);
        setIsApproveOpen(true);
    };

    const handleReject = async (citaId: number) => {
        const motivo = prompt("Ingrese el motivo del rechazo:");
        if (!motivo) return;

        try {
            await rejectMutation.mutateAsync({ id: citaId, data: { motivo_rechazo: motivo } });
            toast.success('Cita rechazada');
        } catch {
            toast.error('Error al rechazar');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Citas</h1>
                    <p className="text-gray-500">Planifica y gestiona tus visitas comerciales</p>
                </div>
                <button
                    onClick={() => { setCitaToEdit(null); setIsCreateOpen(true); }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:bg-indigo-700 transition"
                >
                    + Nueva Cita
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('MIS_CITAS')}
                    className={`pb-2 px-1 ${activeTab === 'MIS_CITAS' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-gray-500'}`}
                >
                    Mis Citas
                </button>
                <button
                    onClick={() => setActiveTab('APROBACION')}
                    className={`pb-2 px-1 ${activeTab === 'APROBACION' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-gray-500'}`}
                >
                    Pendientes de Aprobación
                    {pendientesAprobacion.length > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                            {pendientesAprobacion.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                {activeTab === 'MIS_CITAS' ? (
                    <div className="space-y-4">
                        {/* Listado de mis citas */}
                        {misCitas.map((cita: Cita) => (
                            <div key={cita.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-xl hover:bg-gray-50 transition border-l-4 border-l-transparent hover:border-l-indigo-500">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-800">{cita.cliente_razon_social}</h3>
                                        <BadgeEstado estado={cita.estado} />
                                    </div>
                                    <div className="text-sm text-gray-500 flex flex-wrap gap-4">
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(cita.fecha).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {cita.hora}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {cita.direccion}</span>
                                    </div>
                                    {cita.estado === 'RECHAZADO' && (
                                        <p className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-1 rounded inline-block">
                                            Motivo Rechazo: {cita.motivo_rechazo}
                                        </p>
                                    )}
                                    {cita.conductor_info && (
                                        <p className="text-xs text-green-700 mt-1 font-medium flex items-center gap-1">
                                            🚗 Transporte: {cita.conductor_info}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 md:mt-0">
                                    {(cita.estado === 'PENDIENTE' || cita.estado === 'RECHAZADO') && (
                                        <button
                                            onClick={() => handleEdit(cita)}
                                            className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                                        >
                                            Editar / Reprogramar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Listado de Aprobación */}
                        {pendientesAprobacion.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay citas pendientes de aprobación</p>
                        ) : (
                            pendientesAprobacion.map((cita: Cita) => (
                                <div key={cita.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-xl bg-yellow-50/30">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{cita.cliente_razon_social}</h3>
                                        <p className="text-sm text-gray-600">
                                            Solicitado por: <span className="font-medium">{cita.comercial_nombre}</span>
                                        </p>
                                        <p className="text-sm text-gray-500 italic mt-1">"{cita.motivo}"</p>
                                        <div className="mt-2 text-xs flex gap-3 text-gray-500 font-mono">
                                            <span>{new Date(cita.fecha).toLocaleDateString()}</span>
                                            <span>{cita.hora}</span>
                                            <span>{cita.tipo_cita}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 md:mt-0">
                                        <button
                                            onClick={() => handleReject(cita.id)}
                                            className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleApproveClick(cita)}
                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm"
                                        >
                                            Aprobar & Asignar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <ModalCita
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                citaToEdit={citaToEdit}
            />

            <ModalAprobarCita
                isOpen={isApproveOpen}
                onClose={() => { setIsApproveOpen(false); setCitaToApprove(null); }}
                cita={citaToApprove}
            />
        </div>
    );
}

function BadgeEstado({ estado }: { estado: string }) {
    const styles = {
        'PENDIENTE': 'bg-yellow-100 text-yellow-700',
        'APROBADO': 'bg-green-100 text-green-700',
        'RECHAZADO': 'bg-red-100 text-red-700',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[estado as keyof typeof styles] || 'bg-gray-100'}`}>
            {estado}
        </span>
    );
}
