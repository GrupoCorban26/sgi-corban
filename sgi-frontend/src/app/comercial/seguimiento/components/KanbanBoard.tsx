import React, { useState, useRef, useEffect } from 'react';
import { UserSearch, KanbanSquare, CheckCircle2, Ship, PackageCheck, XCircle, Search, RefreshCw } from 'lucide-react';
import { Seguimiento } from '@/types/seguimiento';
import SeguimientoCard from './SeguimientoCard';
import { toast } from 'sonner';

type EstadoSeguimiento = 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO';

interface KanbanBoardProps {
    seguimientos: Seguimiento[];
    onMoverTarjeta: (id: number, estadoNuevo: EstadoSeguimiento) => void;
    onSeleccionarTarjeta: (seguimiento: Seguimiento) => void;
    isLoading: boolean;
    refetch: () => void;
}

/* ── Mapa de transiciones válidas ── */
const TRANSICIONES_VALIDAS: Record<EstadoSeguimiento, EstadoSeguimiento[]> = {
    SOLICITUD: ['COTIZADO', 'CAIDO'],
    COTIZADO: ['CIERRE', 'CAIDO'],
    CIERRE: ['EN_OPERACION', 'COTIZADO', 'CAIDO'],
    EN_OPERACION: ['CARGA_ENTREGADA', 'CAIDO'],
    CARGA_ENTREGADA: [], // terminal
    CAIDO: ['COTIZADO'],
};

/* ── Skeleton Card para loading ── */
function SkeletonCard() {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse">
            <div className="flex justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded-md" />
                <div className="h-3 w-14 bg-slate-200 rounded-md" />
            </div>
            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-10 w-full bg-slate-100 rounded-xl" />
            <div className="flex gap-1.5">
                <div className="h-6 w-16 bg-slate-100 rounded-lg" />
                <div className="h-6 w-20 bg-slate-100 rounded-lg" />
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-50">
                <div className="h-3 w-16 bg-slate-100 rounded-md" />
                <div className="h-3 w-12 bg-slate-100 rounded-md" />
            </div>
        </div>
    );
}

/* ── Columna de configuración (6 estados) ── */
const COLUMN_CONFIG = {
    SOLICITUD: {
        icon: UserSearch,
        label: 'SOLICITUD DE COTIZACIÓN',
        bgIdle: 'bg-slate-50/30',
        bgDragOver: 'bg-slate-50/70 border-slate-400 ring-2 ring-slate-200/30',
        headerBg: 'bg-slate-500/10 text-slate-600',
        badge: 'bg-slate-100 text-slate-700',
        emptyIcon: 'text-slate-300',
        emptyText: 'Sin prospectos activos',
        emptyHint: 'Los nuevos prospectos aparecerán aquí',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-slate-200',
    },
    COTIZADO: {
        icon: KanbanSquare,
        label: 'COTIZADOS',
        bgIdle: 'bg-indigo-50/30',
        bgDragOver: 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200/30',
        headerBg: 'bg-indigo-500/10 text-indigo-600',
        badge: 'bg-indigo-100 text-indigo-700',
        emptyIcon: 'text-indigo-300',
        emptyText: 'Sin cotizaciones activas',
        emptyHint: 'Las nuevas cotizaciones aparecerán aquí',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-indigo-200',
    },
    CIERRE: {
        icon: CheckCircle2,
        label: 'CIERRE (COR)',
        bgIdle: 'bg-emerald-50/20',
        bgDragOver: 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200/30',
        headerBg: 'bg-emerald-500/10 text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-700',
        emptyIcon: 'text-emerald-300',
        emptyText: '🎯 Arrastra aquí cuando cierres una negociación',
        emptyHint: 'Se te pedirá el código COR y la cotización aceptada',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-emerald-200',
    },
    EN_OPERACION: {
        icon: Ship,
        label: 'EN OPERACIÓN',
        bgIdle: 'bg-blue-50/20',
        bgDragOver: 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200/30',
        headerBg: 'bg-blue-500/10 text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
        emptyIcon: 'text-blue-300',
        emptyText: '🚢 Arrastra aquí las operaciones activas',
        emptyHint: 'Se registrarán ETA, incoterm y documentos',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-blue-200',
    },
    CARGA_ENTREGADA: {
        icon: PackageCheck,
        label: 'CARGA ENTREGADA',
        bgIdle: 'bg-violet-50/15',
        bgDragOver: 'bg-violet-50/70 border-violet-300 ring-2 ring-violet-200/30',
        headerBg: 'bg-violet-500/10 text-violet-600',
        badge: 'bg-violet-100 text-violet-700',
        emptyIcon: 'text-violet-300',
        emptyText: '📦 Operaciones completadas',
        emptyHint: 'Cargas entregadas al cliente',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-violet-200',
    },
    CAIDO: {
        icon: XCircle,
        label: 'NEGOCIACIONES CAÍDAS',
        bgIdle: 'bg-rose-50/15',
        bgDragOver: 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200/30',
        headerBg: 'bg-rose-500/10 text-rose-600',
        badge: 'bg-rose-100 text-rose-700',
        emptyIcon: 'text-rose-300',
        emptyText: 'Arrastra aquí si la cotización no prosperó',
        emptyHint: 'Se te pedirá el motivo de la caída',
        scrollThumb: '[&::-webkit-scrollbar-thumb]:bg-rose-200',
    },
} as const;

type ColumnKey = keyof typeof COLUMN_CONFIG;

const COLUMN_ORDER: ColumnKey[] = ['SOLICITUD', 'COTIZADO', 'CIERRE', 'EN_OPERACION', 'CARGA_ENTREGADA', 'CAIDO'];

export default function KanbanBoard({
    seguimientos,
    onMoverTarjeta,
    onSeleccionarTarjeta,
    isLoading,
    refetch
}: KanbanBoardProps) {
    const [busqueda, setBusqueda] = useState('');
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [dragSourceState, setDragSourceState] = useState<EstadoSeguimiento | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Ctrl+K para focus en buscador
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'Escape') {
                searchRef.current?.blur();
                setBusqueda('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filtrar tarjetas localmente por búsqueda
    const tarjetasFiltradas = seguimientos.filter(seg => 
        seg.cliente_razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
        seg.cliente_ruc?.includes(busqueda) ||
        seg.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        seg.comercial_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Separar seguimientos por columnas
    const columns: Record<ColumnKey, Seguimiento[]> = {
        SOLICITUD: tarjetasFiltradas.filter(t => t.estado === 'SOLICITUD'),
        COTIZADO: tarjetasFiltradas.filter(t => t.estado === 'COTIZADO'),
        CIERRE: tarjetasFiltradas.filter(t => t.estado === 'CIERRE'),
        EN_OPERACION: tarjetasFiltradas.filter(t => t.estado === 'EN_OPERACION'),
        CARGA_ENTREGADA: tarjetasFiltradas.filter(t => t.estado === 'CARGA_ENTREGADA'),
        CAIDO: tarjetasFiltradas.filter(t => t.estado === 'CAIDO'),
    };

    // Drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDragEnter = (e: React.DragEvent, colName: string) => {
        e.preventDefault();
        setDragOverColumn(colName);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, colName: ColumnKey) => {
        e.preventDefault();
        setDragOverColumn(null);
        setDragSourceState(null);
        
        const cardIdStr = e.dataTransfer.getData('text/plain');
        if (!cardIdStr) return;

        const cardId = parseInt(cardIdStr);
        const tarjeta = seguimientos.find(t => t.id === cardId);
        
        if (!tarjeta) return;
        if (tarjeta.estado === colName) return;

        // Validar transición permitida
        const transicionesPermitidas = TRANSICIONES_VALIDAS[tarjeta.estado as EstadoSeguimiento] || [];
        if (!transicionesPermitidas.includes(colName)) {
            toast.error(`No se puede mover de ${tarjeta.estado} a ${colName}`);
            return;
        }

        onMoverTarjeta(cardId, colName);
    };

    // Track drag source for visual feedback on valid columns
    const handleGlobalDragStart = (e: React.DragEvent) => {
        const cardIdStr = e.dataTransfer.getData('text/plain');
        if (cardIdStr) {
            const cardId = parseInt(cardIdStr);
            const tarjeta = seguimientos.find(t => t.id === cardId);
            if (tarjeta) {
                setDragSourceState(tarjeta.estado as EstadoSeguimiento);
            }
        }
    };

    const handleGlobalDragEnd = () => {
        setDragSourceState(null);
        setDragOverColumn(null);
    };

    // Check if a column is a valid drop target for the current dragged card
    const isValidDropTarget = (colKey: ColumnKey): boolean => {
        if (!dragSourceState) return true;
        if (dragSourceState === colKey) return false;
        return (TRANSICIONES_VALIDAS[dragSourceState] || []).includes(colKey);
    };

    // Skeleton loading
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="h-10 w-80 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-10 w-36 bg-slate-100 rounded-xl animate-pulse" />
                </div>
                
                {/* Horizontal Scroll Layout for Skeleton */}
                <div className="flex gap-4 items-stretch overflow-x-auto pb-5 min-h-[calc(100vh-260px)]">
                    {COLUMN_ORDER.map((col) => {
                        const config = COLUMN_CONFIG[col];
                        return (
                            <div 
                                key={col} 
                                className={`flex flex-col w-[290px] xl:w-[315px] flex-shrink-0 min-h-[500px] ${config.bgIdle} border border-slate-200/80 rounded-2xl p-4`}
                            >
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <div className="h-7 w-7 bg-slate-200 rounded-lg animate-pulse" />
                                    <div className="h-4 w-24 bg-slate-200 rounded-md animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    <SkeletonCard />
                                    {(col === 'COTIZADO' || col === 'SOLICITUD') && <SkeletonCard />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4" onDragEnd={handleGlobalDragEnd}>
            
            {/* Buscador Superior */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Buscar por Razón Social, RUC, embarque o comercial...  (Ctrl+K)"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all placeholder:text-slate-400 text-slate-800"
                    />
                </div>
                
                <button
                    onClick={refetch}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer active:scale-[0.97]"
                >
                    <RefreshCw size={13} /> Sincronizar
                </button>
            </div>

            {/* Tablero Kanban (6 columnas, scroll horizontal para PCs/laptops) */}
            <div className="flex gap-4 items-stretch overflow-x-auto pb-5 min-h-[calc(100vh-260px)]
                [&::-webkit-scrollbar]:h-2.5
                [&::-webkit-scrollbar-track]:bg-slate-100/30
                [&::-webkit-scrollbar-track]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-slate-200/80
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-indigo-300/80
                active:[&::-webkit-scrollbar-thumb]:bg-indigo-400/90
                transition-all duration-200"
            >
                
                {COLUMN_ORDER.map((colKey) => {
                    const config = COLUMN_CONFIG[colKey];
                    const items = columns[colKey];
                    const Icon = config.icon;
                    const isDragOver = dragOverColumn === colKey;
                    const validTarget = isValidDropTarget(colKey);
                    const showInvalidOverlay = dragSourceState !== null && !validTarget && dragSourceState !== colKey;

                    return (
                        <div
                            key={colKey}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, colKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, colKey)}
                            className={`relative flex flex-col w-[290px] xl:w-[315px] flex-shrink-0 border border-slate-200/80 rounded-2xl p-4 transition-all duration-200 ${
                                isDragOver && validTarget ? config.bgDragOver : config.bgIdle
                            } ${showInvalidOverlay ? 'opacity-40' : ''}`}
                        >
                            {/* Header de columna */}
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`p-1.5 rounded-lg ${config.headerBg}`}>
                                        <Icon size={14} />
                                    </span>
                                    <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">{config.label}</h3>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${config.badge}`}>
                                        {items.length}
                                    </span>
                                </div>
                            </div>

                            {/* Lista de tarjetas */}
                            <div className={`flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1.5 
                                [&::-webkit-scrollbar]:w-1.5
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:rounded-full
                                ${config.scrollThumb}
                            `}>
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200/80 rounded-2xl text-center px-4">
                                        <Icon size={28} className={`mb-3.5 ${config.emptyIcon}`} />
                                        <span className="text-[11px] font-bold text-slate-400">{config.emptyText}</span>
                                        <span className="text-[10px] text-slate-300 mt-1 max-w-[200px] leading-normal">{config.emptyHint}</span>
                                    </div>
                                ) : (
                                    items.map(t => (
                                        <SeguimientoCard 
                                            key={t.id} 
                                            seguimiento={t} 
                                            onClick={() => onSeleccionarTarjeta(t)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
