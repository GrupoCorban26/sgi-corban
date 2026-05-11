'use client';

import React, { useState } from 'react';
import { useInstancias, useComerciales } from '@/hooks/comercial/useSupervision';
import { EvoInstancia, EvoConversacion, ComercialInfo } from '@/types/supervision';
import ConversacionPanel from './ConversacionPanel';
import MensajePanel from './MensajePanel';
import ModalQR from './ModalQR';
import {
    QrCode, Eye, Building2, User, ChevronDown, AlertCircle
} from 'lucide-react';

const EMPRESAS = [
    'Corban Agencia de Aduanas',
    'Corban Trans Logistic',
    'EBL',
];

const estadoBadge: Record<string, { bg: string; dot: string }> = {
    CONECTADO: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    CONECTANDO: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    DESCONECTADO: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export default function VistaJefe() {
    const { instancias, isLoading: loadingInstancias, refetch } = useInstancias();

    // ── Filtros ──
    const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
    const [selectedComercialId, setSelectedComercialId] = useState<number | null>(null);

    // ── Paneles ──
    const [selectedInstancia, setSelectedInstancia] = useState<EvoInstancia | null>(null);
    const [selectedConversacion, setSelectedConversacion] = useState<EvoConversacion | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrInstanciaId, setQrInstanciaId] = useState<number | null>(null);

    // Fetch comerciales filtrados por empresa
    const { data: comerciales, isLoading: loadingComerciales } = useComerciales(selectedEmpresa);

    // Cuando se selecciona un comercial en el filtro, buscar su instancia
    const handleSelectComercial = (comercial: ComercialInfo) => {
        setSelectedComercialId(comercial.usuario_id);
        setSelectedConversacion(null);

        if (comercial.tiene_instancia && comercial.instancia_id) {
            // Buscar la instancia completa en la lista ya cargada
            const inst = instancias.find((i) => i.id === comercial.instancia_id);
            if (inst) {
                setSelectedInstancia(inst);
            } else {
                // Si no está en la lista (puede pasar con RBAC), crear un objeto mínimo
                setSelectedInstancia({
                    id: comercial.instancia_id,
                    instance_name: '',
                    instance_id: null,
                    usuario_id: comercial.usuario_id,
                    nombre_comercial: comercial.nombre_completo,
                    telefono: comercial.telefono,
                    estado: comercial.estado_instancia || 'DESCONECTADO',
                    profile_name: null,
                    profile_pic_url: null,
                    last_seen: null,
                    created_at: null,
                    total_conversaciones: comercial.total_conversaciones,
                    total_mensajes: 0,
                });
            }
        } else {
            setSelectedInstancia(null);
        }
    };

    const handleEmpresaChange = (empresa: string) => {
        if (empresa === '') {
            setSelectedEmpresa(null);
        } else {
            setSelectedEmpresa(empresa);
        }
        setSelectedComercialId(null);
        setSelectedInstancia(null);
        setSelectedConversacion(null);
    };

    const handleShowQR = (instanciaId: number) => {
        setQrInstanciaId(instanciaId);
        setShowQRModal(true);
    };

    // Stats
    const conectados = instancias.filter((i) => i.estado === 'CONECTADO').length;
    const selectedComercial = comerciales?.find(
        (c) => c.usuario_id === selectedComercialId
    );

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* ── Header con filtros ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-lg font-bold text-azul-900 flex items-center gap-2">
                            <Eye size={20} className="text-naranja-500" />
                            Supervisión WhatsApp
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {instancias.length} comercial{instancias.length !== 1 ? 'es' : ''} vinculado{instancias.length !== 1 ? 's' : ''}
                            {' · '}{conectados} online
                        </p>
                    </div>
                </div>

                {/* ── Filtros: Empresa → Comercial ── */}
                <div className="flex items-center gap-3">
                    {/* Filtro Empresa */}
                    <div className="relative min-w-[220px]">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            value={selectedEmpresa || ''}
                            onChange={(e) => handleEmpresaChange(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 
                                       focus:outline-none focus:ring-2 focus:ring-naranja-500/20 focus:border-naranja-500/50 
                                       transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todas las empresas</option>
                            {EMPRESAS.map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Filtro Comercial */}
                    <div className="relative flex-1 max-w-md">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            value={selectedComercialId || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                const com = comerciales?.find((c) => c.usuario_id === id);
                                if (com) handleSelectComercial(com);
                            }}
                            disabled={!selectedEmpresa}
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 
                                       focus:outline-none focus:ring-2 focus:ring-naranja-500/20 focus:border-naranja-500/50 
                                       transition-all appearance-none cursor-pointer
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                            <option value="">
                                {!selectedEmpresa
                                    ? 'Selecciona una empresa primero'
                                    : loadingComerciales
                                        ? 'Cargando...'
                                        : 'Selecciona un comercial'
                                }
                            </option>
                            {comerciales?.map((com) => (
                                <option key={com.usuario_id} value={com.usuario_id}>
                                    {com.nombre_completo}
                                    {com.tiene_instancia
                                        ? com.estado_instancia === 'CONECTADO'
                                            ? ' ● En línea'
                                            : com.estado_instancia === 'CONECTANDO'
                                                ? ' ◐ Conectando'
                                                : ' ○ Desconectado'
                                        : ' — Sin vincular'
                                    }
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* ── Lista horizontal de comerciales de la empresa (resumen visual) ── */}
                {selectedEmpresa && comerciales && comerciales.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 custom-scrollbar">
                        {comerciales.map((com) => {
                            const isSelected = selectedComercialId === com.usuario_id;
                            const cfg = com.estado_instancia
                                ? estadoBadge[com.estado_instancia] || estadoBadge.DESCONECTADO
                                : { bg: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
                            return (
                                <button
                                    key={com.usuario_id}
                                    onClick={() => handleSelectComercial(com)}
                                    className={`
                                        group relative flex items-center gap-3 px-4 py-2.5 rounded-xl border
                                        transition-all min-w-fit cursor-pointer flex-shrink-0
                                        ${isSelected
                                            ? 'bg-azul-500 border-azul-500 text-white shadow-md shadow-azul-500/20'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-azul-300 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                            ${isSelected ? 'bg-white/20 text-white' : 'bg-azul-100 text-azul-600'}
                                        `}>
                                            {com.nombre_completo.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`
                                            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2
                                            ${isSelected ? 'border-azul-500' : 'border-white'} ${cfg.dot}
                                            ${com.estado_instancia === 'CONECTANDO' ? 'animate-pulse' : ''}
                                        `} />
                                    </div>

                                    {/* Nombre + estado */}
                                    <div className="text-left min-w-0">
                                        <div className={`text-sm font-semibold truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {com.nombre_completo.split(' ').slice(0, 2).join(' ')}
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                            {com.tiene_instancia
                                                ? `${com.total_conversaciones} chats`
                                                : 'Sin vincular'
                                            }
                                        </div>
                                    </div>

                                    {/* Acción QR si tiene instancia pero no conectado */}
                                    {com.tiene_instancia && com.estado_instancia !== 'CONECTADO' && com.instancia_id && (
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                            <span
                                                onClick={(e) => { e.stopPropagation(); handleShowQR(com.instancia_id!); }}
                                                className={`p-1 rounded-lg cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-slate-100 text-slate-400'}`}
                                                title="Ver QR"
                                            >
                                                <QrCode size={14} />
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Panel de contenido: Conversaciones + Mensajes ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {selectedInstancia ? (
                    <>
                        {/* Conversaciones (izquierda) */}
                        <ConversacionPanel
                            instancia={selectedInstancia}
                            selectedConvId={selectedConversacion?.id ?? null}
                            onSelect={setSelectedConversacion}
                        />
                        {/* Mensajes (derecha) */}
                        <MensajePanel
                            conversacion={selectedConversacion}
                            instancia={selectedInstancia}
                        />
                    </>
                ) : selectedComercial && !selectedComercial.tiene_instancia ? (
                    /* Comercial sin instancia */
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-amber-50 rounded-2xl p-8 max-w-sm text-center border border-amber-200">
                            <AlertCircle size={40} className="mx-auto mb-3 text-amber-500" />
                            <p className="text-base font-semibold text-slate-700 mb-1">
                                {selectedComercial.nombre_completo}
                            </p>
                            <p className="text-sm text-slate-500">
                                Este comercial aún no ha vinculado su WhatsApp.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Nada seleccionado */
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Eye size={56} className="mb-4 opacity-20" />
                        <p className="text-base font-medium text-slate-500">
                            Selecciona un comercial
                        </p>
                        <p className="text-sm mt-1 text-slate-400">
                            para supervisar sus conversaciones de WhatsApp
                        </p>
                    </div>
                )}
            </div>

            {/* Modal QR */}
            {showQRModal && qrInstanciaId && (
                <ModalQR
                    instanciaId={qrInstanciaId}
                    onClose={() => { setShowQRModal(false); setQrInstanciaId(null); refetch(); }}
                />
            )}
        </div>
    );
}
