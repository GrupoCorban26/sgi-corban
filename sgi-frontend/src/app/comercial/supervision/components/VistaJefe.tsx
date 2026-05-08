'use client';

import React, { useState, useMemo } from 'react';
import { useInstancias } from '@/hooks/comercial/useSupervision';
import { EvoInstancia, EvoConversacion } from '@/types/supervision';
import ConversacionPanel from './ConversacionPanel';
import MensajePanel from './MensajePanel';
import ModalQR from './ModalQR';
import {
    Search, Loader2, QrCode, Eye
} from 'lucide-react';

const estadoBadge: Record<string, { bg: string; dot: string }> = {
    CONECTADO: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    CONECTANDO: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    DESCONECTADO: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export default function VistaJefe() {
    const { instancias, isLoading, refetch } = useInstancias();

    const [search, setSearch] = useState('');
    const [selectedInstancia, setSelectedInstancia] = useState<EvoInstancia | null>(null);
    const [selectedConversacion, setSelectedConversacion] = useState<EvoConversacion | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrInstanciaId, setQrInstanciaId] = useState<number | null>(null);

    // Filtrar instancias por búsqueda
    const filtered = useMemo(() => {
        if (!search.trim()) return instancias;
        const q = search.toLowerCase();
        return instancias.filter(
            (i) =>
                (i.nombre_comercial || '').toLowerCase().includes(q) ||
                (i.telefono || '').includes(q) ||
                (i.profile_name || '').toLowerCase().includes(q)
        );
    }, [instancias, search]);

    const handleSelectComercial = (inst: EvoInstancia) => {
        setSelectedInstancia(inst);
        setSelectedConversacion(null);
    };

    const handleShowQR = (instanciaId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setQrInstanciaId(instanciaId);
        setShowQRModal(true);
    };

    const conectados = instancias.filter((i) => i.estado === 'CONECTADO').length;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* ── Header con selector de comercial ── */}
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

                {/* Buscador */}
                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-naranja-500/20 focus:border-naranja-500/50 transition-all"
                    />
                </div>

                {/* Lista horizontal de comerciales */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Cargando...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-slate-400 py-2">
                            {search ? 'Sin resultados' : 'Ningún comercial ha vinculado su WhatsApp aún'}
                        </p>
                    ) : (
                        filtered.map((inst) => {
                            const isSelected = selectedInstancia?.id === inst.id;
                            const cfg = estadoBadge[inst.estado] || estadoBadge.DESCONECTADO;
                            return (
                                <button
                                    key={inst.id}
                                    onClick={() => handleSelectComercial(inst)}
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
                                            {(inst.nombre_comercial || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`
                                            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2
                                            ${isSelected ? 'border-azul-500' : 'border-white'} ${cfg.dot}
                                            ${inst.estado === 'CONECTANDO' ? 'animate-pulse' : ''}
                                        `} />
                                    </div>

                                    {/* Nombre */}
                                    <div className="text-left min-w-0">
                                        <div className={`text-sm font-semibold truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {inst.nombre_comercial || inst.instance_name}
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                            {inst.total_conversaciones} chats
                                        </div>
                                    </div>

                                    {/* QR action (hover, solo si no conectado) */}
                                    {inst.estado !== 'CONECTADO' && (
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                            <span
                                                onClick={(e) => handleShowQR(inst.id, e)}
                                                className={`p-1 rounded-lg cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-slate-100 text-slate-400'}`}
                                                title="Ver QR"
                                            >
                                                <QrCode size={14} />
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
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
                ) : (
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
