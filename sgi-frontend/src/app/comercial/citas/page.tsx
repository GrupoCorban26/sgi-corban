'use client';

import React, { useState } from 'react';
import { useCitas, Cita } from '@/hooks/comercial/useCitas';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, Users, Target } from 'lucide-react';
import ModalCita from '@/components/comercial/ModalCita';
import ModalSalidaCampo from '@/components/comercial/ModalSalidaCampo';
import ModalAprobarCita from '@/components/comercial/ModalAprobarCita';
import { toast } from 'sonner';

// TODO: Obtener roles del usuario actual para mostrar/ocultar botones
const userRoles = ['JEFE_COMERCIAL']; // Simulado - en producción viene del contexto de auth

export default function CitasPage() {
    const [activeTab, setActiveTab] = useState<'MIS_CITAS' | 'APROBACION' | 'SALIDAS_CAMPO'>('MIS_CITAS');

    const { citas, isLoading, rejectMutation, terminateMutation } = useCitas();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [citaToEdit, setCitaToEdit] = useState<Cita | null>(null);

    const [isSalidaCampoOpen, setIsSalidaCampoOpen] = useState(false);
    const [salidaToEdit, setSalidaToEdit] = useState<Cita | null>(null);

    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [citaToApprove, setCitaToApprove] = useState<Cita | null>(null);

    // Filtrar citas por tipo
    const citasIndividuales = citas.filter((c: Cita) => c.tipo_agenda === 'INDIVIDUAL');
    const salidasCampo = citas.filter((c: Cita) => c.tipo_agenda === 'SALIDA_CAMPO');
    const pendientesAprobacion = citasIndividuales.filter((c: Cita) => c.estado === 'PENDIENTE');

    const esJefeComercial = userRoles.some(r => ['JEFE_COMERCIAL', 'ADMIN', 'GERENTE'].includes(r));

    const handleEdit = (cita: Cita) => {
        if (cita.tipo_agenda === 'SALIDA_CAMPO') {
            setSalidaToEdit(cita);
            setIsSalidaCampoOpen(true);
        } else {
            setCitaToEdit(cita);
            setIsCreateOpen(true);
        }
    };

    const handleApproveClick = (cita: Cita) => {
        setCitaToApprove(cita);
        setIsApproveOpen(true);
    };

    const handleTerminar = async (citaId: number) => {
        try {
            await terminateMutation.mutateAsync(citaId);
            toast.success('Cita finalizada correctamente');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al finalizar');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Citas</h1>
                    <p className="text-gray-500">Planifica y gestiona tus visitas comerciales</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setCitaToEdit(null); setIsCreateOpen(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:bg-indigo-700 transition"
                    >
                        + Nueva Cita
                    </button>
                    {esJefeComercial && (
                        <button
                            onClick={() => { setSalidaToEdit(null); setIsSalidaCampoOpen(true); }}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl shadow hover:bg-emerald-700 transition flex items-center gap-2"
                        >
                            <Users size={18} /> Salida a Campo
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('MIS_CITAS')}
                    className={`pb-2 px-1 ${activeTab === 'MIS_CITAS' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-gray-500'}`}
                >
                    Mis Citas
                </button>
                {esJefeComercial && (
                    <>
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
                        <button
                            onClick={() => setActiveTab('SALIDAS_CAMPO')}
                            className={`pb-2 px-1 ${activeTab === 'SALIDAS_CAMPO' ? 'border-b-2 border-emerald-600 font-bold text-emerald-600' : 'text-gray-500'}`}
                        >
                            Salidas a Campo
                        </button>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : activeTab === 'MIS_CITAS' ? (
                    <div className="space-y-4">
                        {citasIndividuales.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No tienes citas programadas</p>
                        ) : (
                            citasIndividuales.map((cita: Cita) => (
                                <CitaCard
                                    key={cita.id}
                                    cita={cita}
                                    onEdit={() => handleEdit(cita)}
                                    onTerminar={() => handleTerminar(cita.id)}
                                />
                            ))
                        )}
                    </div>
                ) : activeTab === 'APROBACION' ? (
                    <div className="space-y-4">
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
                                        <div className="mt-2 text-xs flex gap-3 text-gray-500">
                                            <span>📅 {new Date(cita.fecha).toLocaleDateString()}</span>
                                            <span>⏰ {cita.hora}</span>
                                            <span>{cita.tipo_cita === 'VISITA_CLIENTE' ? '🚗 Irá al cliente' : '🏢 Cliente vendrá'}</span>
                                            {cita.con_presente && <span>🎁 Llevará regalo</span>}
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <button
                                            onClick={() => handleApproveClick(cita)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                                        >
                                            Revisar y Aprobar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* Salidas a Campo */
                    <div className="space-y-4">
                        {salidasCampo.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay salidas a campo programadas</p>
                        ) : (
                            salidasCampo.map((salida: Cita) => (
                                <div key={salida.id} className="p-4 border rounded-xl bg-emerald-50/30 border-l-4 border-l-emerald-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Target size={18} className="text-emerald-600" />
                                                <h3 className="font-bold text-gray-800">Salida a Campo</h3>
                                                <BadgeEstado estado={salida.estado} />
                                            </div>
                                            <p className="text-sm text-gray-700">{salida.objetivo_campo || salida.motivo}</p>
                                            <div className="mt-2 text-xs flex gap-3 text-gray-500">
                                                <span>📅 {new Date(salida.fecha).toLocaleDateString()}</span>
                                                <span>⏰ {salida.hora}</span>
                                                {salida.direccion && <span>📍 {salida.direccion}</span>}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {salida.comerciales_asignados?.map((c) => (
                                                    <span key={c.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                                        {c.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleEdit(salida)}
                                            className="text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-medium"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modales */}
            <ModalCita
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                citaToEdit={citaToEdit}
            />

            <ModalSalidaCampo
                isOpen={isSalidaCampoOpen}
                onClose={() => { setIsSalidaCampoOpen(false); setSalidaToEdit(null); }}
                salidaToEdit={salidaToEdit}
            />

            <ModalAprobarCita
                isOpen={isApproveOpen}
                onClose={() => { setIsApproveOpen(false); setCitaToApprove(null); }}
                cita={citaToApprove}
            />
        </div>
    );
}

function CitaCard({ cita, onEdit, onTerminar }: { cita: Cita; onEdit: () => void; onTerminar: () => void }) {
    const esHoy = new Date(cita.fecha).toDateString() === new Date().toDateString();

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-xl hover:bg-gray-50 transition border-l-4 border-l-transparent hover:border-l-indigo-500">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{cita.cliente_razon_social}</h3>
                    <BadgeEstado estado={cita.estado} />
                </div>
                <div className="text-sm text-gray-500 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(cita.fecha).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {cita.hora}</span>
                    {cita.direccion && <span className="flex items-center gap-1"><MapPin size={14} /> {cita.direccion}</span>}
                </div>
                {cita.estado === 'RECHAZADO' && (
                    <p className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-1 rounded inline-block">
                        Motivo Rechazo: {cita.motivo_rechazo}
                    </p>
                )}
                {cita.acompanante_nombre && (
                    <p className="text-xs text-indigo-600 mt-1">👥 Acompañado por: {cita.acompanante_nombre}</p>
                )}
                {cita.conductor_info && (
                    <p className="text-xs text-green-700 mt-1">🚗 Transporte: {cita.conductor_info}</p>
                )}
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
                {(cita.estado === 'PENDIENTE' || cita.estado === 'RECHAZADO') && (
                    <button
                        onClick={onEdit}
                        className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                        Editar
                    </button>
                )}
                {cita.estado === 'APROBADO' && esHoy && (
                    <button
                        onClick={onTerminar}
                        className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                        Marcar Terminada
                    </button>
                )}
            </div>
        </div>
    );
}

function BadgeEstado({ estado }: { estado: string }) {
    const styles: Record<string, string> = {
        'PENDIENTE': 'bg-yellow-100 text-yellow-700',
        'APROBADO': 'bg-green-100 text-green-700',
        'RECHAZADO': 'bg-red-100 text-red-700',
        'TERMINADO': 'bg-blue-100 text-blue-700',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[estado] || 'bg-gray-100'}`}>
            {estado}
        </span>
    );
}
