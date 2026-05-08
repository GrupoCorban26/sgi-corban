'use client';

import React from 'react';
import { EvoInstancia } from '@/types/supervision';
import { Wifi, WifiOff, Loader2, Plus, QrCode, Trash2, User, MessageSquare } from 'lucide-react';

interface ComercialPanelProps {
    instancias: EvoInstancia[];
    isLoading: boolean;
    selectedId: number | null;
    onSelect: (inst: EvoInstancia) => void;
    onShowQR: (instanciaId: number) => void;
    onEliminar: (instanciaId: number) => void;
    onCrear: () => void;
}

const estadoConfig = {
    CONECTADO: {
        color: 'bg-emerald-500',
        ring: 'ring-emerald-500/30',
        icon: Wifi,
        label: 'Conectado',
        textColor: 'text-emerald-400',
    },
    CONECTANDO: {
        color: 'bg-amber-500',
        ring: 'ring-amber-500/30',
        label: 'Conectando...',
        icon: Loader2,
        textColor: 'text-amber-400',
    },
    DESCONECTADO: {
        color: 'bg-red-500',
        ring: 'ring-red-500/30',
        icon: WifiOff,
        label: 'Desconectado',
        textColor: 'text-red-400',
    },
};

export default function ComercialPanel({
    instancias,
    isLoading,
    selectedId,
    onSelect,
    onShowQR,
    onEliminar,
    onCrear,
}: ComercialPanelProps) {
    const conectados = instancias.filter(i => i.estado === 'CONECTADO').length;

    return (
        <div className="w-80 min-w-[320px] flex flex-col border-r border-azul-800 bg-azul-900">
            {/* Header */}
            <div className="p-4 border-b border-azul-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white">Supervisión</h2>
                    <button
                        onClick={onCrear}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-naranja-500 hover:bg-naranja-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-lg shadow-naranja-500/20"
                    >
                        <Plus size={14} />
                        Agregar
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-azul-300">
                        {instancias.length} instancia{instancias.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {conectados} online
                    </span>
                </div>
            </div>

            {/* Lista de instancias */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-azul-400">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <span className="text-sm">Cargando...</span>
                    </div>
                ) : instancias.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-azul-400 px-6 text-center">
                        <User size={32} className="mb-3 opacity-50" />
                        <p className="text-sm font-medium">Sin instancias</p>
                        <p className="text-xs mt-1 opacity-70">
                            Agrega un comercial para comenzar la supervisión
                        </p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {instancias.map((inst) => {
                            const cfg = estadoConfig[inst.estado] || estadoConfig.DESCONECTADO;
                            const isSelected = selectedId === inst.id;
                            const IconEstado = cfg.icon;

                            return (
                                <div
                                    key={inst.id}
                                    onClick={() => onSelect(inst)}
                                    className={`
                                        group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'bg-azul-700/80 ring-1 ring-naranja-500/40 shadow-lg'
                                            : 'hover:bg-azul-800/60'
                                        }
                                    `}
                                >
                                    {/* Avatar con indicador de estado */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center
                                            bg-azul-700 text-azul-200 font-bold text-sm
                                            ring-2 ${cfg.ring}
                                        `}>
                                            {inst.nombre_comercial
                                                ? inst.nombre_comercial.charAt(0).toUpperCase()
                                                : '?'}
                                        </div>
                                        <span className={`
                                            absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
                                            border-2 border-azul-900 ${cfg.color}
                                            ${inst.estado === 'CONECTANDO' ? 'animate-pulse' : ''}
                                        `} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white truncate">
                                                {inst.nombre_comercial || inst.instance_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <IconEstado
                                                size={12}
                                                className={`${cfg.textColor} ${inst.estado === 'CONECTANDO' ? 'animate-spin' : ''}`}
                                            />
                                            <span className={`text-xs ${cfg.textColor}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        {inst.telefono && (
                                            <span className="text-xs text-azul-400 mt-0.5 block">
                                                +{inst.telefono}
                                            </span>
                                        )}
                                        {/* Contadores */}
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-azul-400">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare size={11} />
                                                {inst.total_conversaciones}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acciones (hover) */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {inst.estado !== 'CONECTADO' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onShowQR(inst.id); }}
                                                className="p-1.5 rounded-lg hover:bg-azul-600 text-azul-300 hover:text-white transition-colors cursor-pointer"
                                                title="Escanear QR"
                                            >
                                                <QrCode size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEliminar(inst.id); }}
                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-azul-400 hover:text-red-400 transition-colors cursor-pointer"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
