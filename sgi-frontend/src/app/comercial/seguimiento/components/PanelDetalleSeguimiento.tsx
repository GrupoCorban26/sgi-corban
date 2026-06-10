'use client';

import React, { useState } from 'react';
import { 
    X, 
    MessageSquare, 
    History, 
    Plus, 
    Send, 
    Calendar, 
    User, 
    Ship, 
    Plane,
    MapPin,
    Loader2,
    RefreshCw,
    Phone,
    Mail,
    MessageCircle,
    Handshake,
    FileCheck,
    CheckCircle2,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    Seguimiento, 
    SeguimientoCatalogos, 
    CotizacionItemCreate 
} from '@/types/seguimiento';
import { 
    useSeguimientoComentarios, 
    useSeguimientoHistorial,
    useSeguimientoDetalle
} from '@/hooks/comercial/useSeguimientos';

/* ── Icono por medio de gestión ── */
const MEDIO_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    'llamada':   { icon: Phone,          color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
    'whatsapp':  { icon: MessageCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    'email':     { icon: Mail,           color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
    'correo':    { icon: Mail,           color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
    'presencial': { icon: Handshake,     color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
    'visita':    { icon: Handshake,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
};

function getMedioConfig(medioNombre: string | null) {
    if (!medioNombre) return { icon: MessageSquare, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' };
    const key = medioNombre.toLowerCase();
    for (const [k, v] of Object.entries(MEDIO_CONFIG)) {
        if (key.includes(k)) return v;
    }
    return { icon: MessageSquare, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' };
}

interface PanelDetalleSeguimientoProps {
    isOpen: boolean;
    onClose: () => void;
    seguimiento: Seguimiento;
    catalogos: SeguimientoCatalogos | undefined;
    onRegistrarComentario: (payload: { comentario: string; medioGestionId?: number }) => Promise<unknown>;
    onAgregarCotizacion: (payload: CotizacionItemCreate) => Promise<unknown>;
    onReactivar?: () => void;
    onToggleDocumento?: (docRelId: number, completado: boolean) => Promise<void>;
}

export default function PanelDetalleSeguimiento({
    isOpen,
    onClose,
    seguimiento: seguimientoProp,
    catalogos,
    onRegistrarComentario,
    onAgregarCotizacion,
    onReactivar,
    onToggleDocumento
}: PanelDetalleSeguimientoProps) {
    const [activeTab, setActiveTab] = useState<'comentarios' | 'historial' | 'cotizar' | 'documentos'>('comentarios');

    // Comentarios
    const [comentarioInput, setComentarioInput] = useState('');
    const [medioId, setMedioId] = useState<number>(1);
    const [isSavingComentario, setIsSavingComentario] = useState(false);

    // Nueva Cotización
    const [tipoCargaId, setTipoCargaId] = useState<number>(1);
    const [tipoServicioId, setTipoServicioId] = useState<number>(1);
    const [tipoOperacion, setTipoOperacion] = useState<'IMPORTACION' | 'EXPORTACION'>('IMPORTACION');
    const [incoterm, setIncoterm] = useState('');
    const [paisOrigen, setPaisOrigen] = useState('');
    const [isSavingCotizacion, setIsSavingCotizacion] = useState(false);

    // Toggle documento loading
    const [togglingDocId, setTogglingDocId] = useState<number | null>(null);

    // Detalle reactivo de la tarjeta de seguimiento/cotización
    const { data: seguimientoResponse } = useSeguimientoDetalle(isOpen ? seguimientoProp.id : null);
    const seguimiento = seguimientoResponse || seguimientoProp;

    // Queries asíncronas para comentarios e historial
    const { data: comentarios = [], isLoading: isLoadingComments } = useSeguimientoComentarios(isOpen ? seguimiento.id : null);
    const { data: historial = [], isLoading: isLoadingHistory } = useSeguimientoHistorial(isOpen ? seguimiento.id : null);

    if (!isOpen) return null;

    const handleSendComentario = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comentarioInput.trim()) return;

        setIsSavingComentario(true);
        try {
            await onRegistrarComentario({
                comentario: comentarioInput.trim(),
                medioGestionId: medioId
            });
            setComentarioInput('');
            toast.success(`✅ Gestión registrada para ${seguimiento.cliente_razon_social}`);
        } catch (err) {
            toast.error('Error al registrar la gestión');
        } finally {
            setIsSavingComentario(false);
        }
    };

    const handleAddCotizacion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCotizacion(true);
        try {
            const payload: CotizacionItemCreate = {
                tipo_carga_id: tipoCargaId,
                tipo_servicio_id: tipoServicioId,
                tipo_operacion: tipoOperacion,
                pais_origen: paisOrigen.trim() || undefined,
                incoterm: incoterm || undefined
            };
            await onAgregarCotizacion(payload);
            setPaisOrigen('');
            setIncoterm('');
            toast.success('Nueva cotización agregada con éxito');
            setActiveTab('comentarios');
        } catch (err) {
            toast.error('Error al agregar la cotización');
        } finally {
            setIsSavingCotizacion(false);
        }
    };

    const handleToggleDoc = async (docRelId: number, nuevoEstado: boolean) => {
        if (!onToggleDocumento) return;
        setTogglingDocId(docRelId);
        try {
            await onToggleDocumento(docRelId, nuevoEstado);
            toast.success(nuevoEstado ? '📄 Documento marcado como recibido' : 'Documento marcado como pendiente');
        } catch {
            toast.error('Error al actualizar el documento');
        } finally {
            setTogglingDocId(null);
        }
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Calcular progreso de documentos
    const documentos = seguimiento.documentos || [];
    const docsCompletados = documentos.filter(d => d.completado).length;
    const docsPendientes = documentos.length - docsCompletados;
    const progresoPorcentaje = documentos.length > 0 ? Math.round((docsCompletados / documentos.length) * 100) : 0;

    // Calcular días restantes al ETA
    const diasRestantesEta = seguimiento.fecha_eta
        ? Math.ceil((new Date(seguimiento.fecha_eta).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const mostrarDocumentos = seguimiento.estado === 'EN_OPERACION' || seguimiento.estado === 'CARGA_ENTREGADA';
    const puedeEditarDocumentos = seguimiento.estado === 'EN_OPERACION';

    /* ── Tab pill config ── */
    const tabs = [
        { id: 'comentarios' as const, icon: MessageSquare, label: 'Gestiones', count: comentarios.length },
        { id: 'historial' as const, icon: History, label: 'Historial', count: historial.length },
        ...(mostrarDocumentos 
            ? [{ id: 'documentos' as const, icon: FileCheck, label: 'Documentos', count: documentos.length }] 
            : []
        ),
        ...(seguimiento.estado === 'COTIZADO' 
            ? [{ id: 'cotizar' as const, icon: Plus, label: 'Cotizar Más', count: undefined }] 
            : []
        ),
    ];

    return (
        <div className="fixed inset-0 z-40 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-300" onClick={onClose} />

            {/* Slide-over panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-100 z-10 animate-in slide-in-from-right duration-300 ease-out">
                    
                    {/* Header */}
                    <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                                Detalle de Embarque
                            </span>
                            <h2 className="text-base font-bold text-slate-800 line-clamp-1 mt-1.5">{seguimiento.titulo}</h2>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                {seguimiento.cliente_razon_social} (RUC {seguimiento.cliente_ruc})
                            </p>
                            {/* Reactivar button - show for CAIDO and CERRADO */}
                            {(seguimiento.estado === 'CAIDO' || seguimiento.estado === 'CIERRE') && onReactivar && (
                                <button
                                    onClick={() => {
                                        onReactivar();
                                        onClose();
                                    }}
                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-md shadow-indigo-200/50 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <RefreshCw size={10} /> Reactivar Cotización
                                </button>
                            )}

                            {/* ETA badge for operational states */}
                            {seguimiento.fecha_eta && mostrarDocumentos && (
                                <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                    diasRestantesEta !== null && diasRestantesEta <= 7
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : diasRestantesEta !== null && diasRestantesEta <= 14
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    <Calendar size={10} />
                                    ETA: {new Date(seguimiento.fecha_eta).toLocaleDateString('es-PE')}
                                    {diasRestantesEta !== null && (
                                        <span className="ml-1">({diasRestantesEta}d)</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer ml-2"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Cotizaciones Asociadas — Mini-cards horizontales */}
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Cotizaciones ({seguimiento.cotizaciones?.length || 0})
                            </span>
                            {seguimiento.estado === 'COTIZADO' && (
                                <button 
                                    onClick={() => setActiveTab('cotizar')}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 cursor-pointer"
                                >
                                    <Plus size={12} /> Nueva
                                </button>
                            )}
                        </div>

                        {seguimiento.cotizaciones && seguimiento.cotizaciones.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                                {seguimiento.cotizaciones.map((c) => {
                                    const isAereo = c.tipo_carga_nombre?.toUpperCase().includes('AEREO') || c.tipo_carga_nombre?.toUpperCase().includes('COURIER');
                                    return (
                                        <div 
                                            key={c.id} 
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                                c.estado === 'ACEPTADO' 
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-100' 
                                                    : c.estado === 'RECHAZADO'
                                                    ? 'bg-rose-50/30 text-rose-500 border-rose-100 line-through opacity-70'
                                                    : c.estado === 'DESCARTADO'
                                                    ? 'bg-slate-50/50 text-slate-400 border-slate-100 line-through opacity-50'
                                                    : 'bg-white text-slate-700 border-slate-200 shadow-sm'
                                            }`}
                                        >
                                            <span className={`p-1 rounded-lg ${
                                                c.estado === 'ACEPTADO' ? 'bg-emerald-100 text-emerald-700' 
                                                    : c.estado === 'RECHAZADO' ? 'bg-rose-100 text-rose-600'
                                                    : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {isAereo ? <Plane size={12} /> : <Ship size={12} />}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-bold flex items-center gap-1 text-xs">
                                                    {c.tipo_carga_nombre}
                                                    {c.incoterm && (
                                                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono">{c.incoterm}</span>
                                                    )}
                                                    {c.pais_origen && (
                                                        <span className="text-[10px] text-slate-400 font-normal">({c.pais_origen})</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                                                    {c.tipo_servicio_nombre} · <span className="uppercase">{c.tipo_operacion}</span>
                                                </div>
                                            </div>
                                            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                                                c.estado === 'ACEPTADO' ? 'bg-emerald-100 text-emerald-700' :
                                                c.estado === 'RECHAZADO' ? 'bg-rose-100 text-rose-700' :
                                                c.estado === 'DESCARTADO' ? 'bg-slate-100 text-slate-500' :
                                                'bg-indigo-50 text-indigo-700'
                                            }`}>
                                                {c.estado === 'ACEPTADO' ? '✓' :
                                                 c.estado === 'RECHAZADO' ? '✗' :
                                                 c.estado === 'DESCARTADO' ? '—' :
                                                 '●'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                <p className="text-[11px] text-slate-400 font-semibold">No hay cotizaciones asociadas</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs — Pills */}
                    <div className="flex gap-1.5 px-6 py-3 bg-slate-50/30 border-b border-slate-100">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200">
                        
                        {/* PESTAÑA COMENTARIOS / GESTIONES */}
                        {activeTab === 'comentarios' && (
                            <div className="space-y-4">
                                {isLoadingComments ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                        <Loader2 size={24} className="animate-spin mb-2" />
                                        <span className="text-xs">Cargando gestiones...</span>
                                    </div>
                                ) : comentarios.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-semibold">Sin gestiones registradas</p>
                                        <p className="text-[11px] mt-0.5">Registra la primera llamada o interacción abajo.</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 py-2">
                                        {comentarios.map((c) => {
                                            const medio = getMedioConfig(c.medio_gestion_nombre);
                                            const MedioIcon = medio.icon;
                                            return (
                                                <div key={c.id} className="relative group">
                                                    {/* Bullet dot con color del medio */}
                                                    <div className={`absolute -left-[22px] top-2 w-3 h-3 rounded-full border-2 border-white ring-2 ring-slate-50 transition-colors ${
                                                        c.medio_gestion_nombre ? medio.color.replace('text-', 'bg-') : 'bg-slate-300'
                                                    }`} />
                                                    
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                                                                <User size={11} /> {c.creador_nombre || 'Comercial'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={11} /> {formatDateTime(c.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{c.comentario}</p>
                                                        {c.medio_gestion_nombre && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${medio.bg} ${medio.color}`}>
                                                                <MedioIcon size={10} />
                                                                {c.medio_gestion_nombre}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PESTAÑA HISTORIAL DE AUDITORÍA */}
                        {activeTab === 'historial' && (
                            <div className="space-y-4">
                                {isLoadingHistory ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                        <Loader2 size={24} className="animate-spin mb-2" />
                                        <span className="text-xs">Cargando historial...</span>
                                    </div>
                                ) : historial.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-12">Sin historial de transiciones.</p>
                                ) : (
                                    <div className="relative pl-4 border-l-2 border-indigo-50 space-y-4 py-2">
                                        {historial.map((h) => (
                                            <div key={h.id} className="relative group">
                                                <div className="absolute -left-[22px] top-2 w-3 h-3 rounded-full bg-indigo-300 border-2 border-white ring-2 ring-indigo-50" />
                                                
                                                <div className="text-xs space-y-1.5 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-slate-800">
                                                            {h.estado_anterior ? h.estado_anterior : 'CREACIÓN'}
                                                        </span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                                                            h.estado_nuevo === 'CIERRE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            h.estado_nuevo === 'CAIDO' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                                            h.estado_nuevo === 'EN_OPERACION' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                            h.estado_nuevo === 'CARGA_ENTREGADA' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                                                            h.estado_nuevo === 'SOLICITUD' ? 'bg-slate-50 text-slate-700 border border-slate-100' :
                                                            'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                        }`}>
                                                            {h.estado_nuevo}
                                                        </span>
                                                    </div>
                                                    {h.comentario && <p className="text-slate-500 text-[11px] leading-relaxed">{h.comentario}</p>}
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                                        <span>Por: {h.usuario_nombre || 'Sistema'}</span>
                                                        <span>{formatDateTime(h.fecha_cambio)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PESTAÑA DOCUMENTOS OPERACIONALES */}
                        {activeTab === 'documentos' && mostrarDocumentos && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                
                                {/* Barra de progreso */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileCheck size={14} className="text-blue-600" />
                                            Control de Documentación
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                            progresoPorcentaje === 100
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                            {docsCompletados}/{documentos.length}
                                        </span>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                                                progresoPorcentaje === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${progresoPorcentaje}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-400">
                                            {progresoPorcentaje === 100 
                                                ? '✅ Todos los documentos recibidos' 
                                                : `${docsPendientes} documento${docsPendientes !== 1 ? 's' : ''} pendiente${docsPendientes !== 1 ? 's' : ''}`
                                            }
                                        </span>
                                        <span className="text-slate-400 font-bold">{progresoPorcentaje}%</span>
                                    </div>

                                    {/* ETA Alert */}
                                    {diasRestantesEta !== null && docsPendientes > 0 && (
                                        <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-semibold ${
                                            diasRestantesEta <= 7
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : diasRestantesEta <= 14
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {diasRestantesEta <= 7 ? <AlertTriangle size={13} /> : <Clock size={13} />}
                                            <span>
                                                {diasRestantesEta <= 0
                                                    ? 'ETA superado — documentos pendientes urgentes'
                                                    : `${diasRestantesEta} día${diasRestantesEta !== 1 ? 's' : ''} restantes hasta ETA`
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Lista de documentos */}
                                <div className="space-y-2">
                                    {documentos.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                doc.completado
                                                    ? 'bg-emerald-50/50 border-emerald-200'
                                                    : 'bg-white border-slate-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <button
                                                type="button"
                                                disabled={!puedeEditarDocumentos || togglingDocId === doc.id}
                                                onClick={() => handleToggleDoc(doc.id, !doc.completado)}
                                                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                    doc.completado
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'border-slate-300 hover:border-blue-400 cursor-pointer'
                                                } ${!puedeEditarDocumentos ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {togglingDocId === doc.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : doc.completado ? (
                                                    <CheckCircle2 size={12} />
                                                ) : null}
                                            </button>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-semibold ${
                                                    doc.completado ? 'text-emerald-800' : 'text-slate-700'
                                                }`}>
                                                    {doc.documento_nombre || `Documento #${doc.documento_id}`}
                                                </p>
                                                {doc.completado && doc.fecha_recepcion && (
                                                    <p className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
                                                        <CheckCircle2 size={9} />
                                                        Recibido el {formatDateTime(doc.fecha_recepcion)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {documentos.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            <FileCheck size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-xs font-semibold">No hay documentos asociados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PESTAÑA NUEVA COTIZACIÓN */}
                        {activeTab === 'cotizar' && seguimiento.estado === 'COTIZADO' && (
                            <form onSubmit={handleAddCotizacion} className="space-y-4 animate-in fade-in duration-200">
                                <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <Ship size={14} /> Nueva Cotización Comercial
                                    </h4>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Tipo Carga</label>
                                            <select
                                                value={tipoCargaId}
                                                onChange={(e) => setTipoCargaId(parseInt(e.target.value))}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                                            >
                                                {catalogos?.tipos_carga.map(tc => (
                                                    <option key={tc.id} value={tc.id}>{tc.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Servicio</label>
                                            <select
                                                value={tipoServicioId}
                                                onChange={(e) => setTipoServicioId(parseInt(e.target.value))}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                                            >
                                                {catalogos?.tipos_servicio.map(ts => (
                                                    <option key={ts.id} value={ts.id}>{ts.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Vía</label>
                                            <select
                                                value={tipoOperacion}
                                                onChange={(e) => setTipoOperacion(e.target.value as 'IMPORTACION' | 'EXPORTACION')}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer font-bold"
                                            >
                                                <option value="IMPORTACION">IMPORTACIÓN</option>
                                                <option value="EXPORTACION">EXPORTACIÓN</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Incoterm</label>
                                            <select
                                                value={incoterm}
                                                onChange={(e) => setIncoterm(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer font-semibold"
                                            >
                                                <option value="">— Incoterm —</option>
                                                <option value="EXW">EXW</option>
                                                <option value="FCA">FCA</option>
                                                <option value="CPT">CPT</option>
                                                <option value="CIP">CIP</option>
                                                <option value="DAP">DAP</option>
                                                <option value="DPU">DPU</option>
                                                <option value="DDP">DDP</option>
                                                <option value="FAS">FAS</option>
                                                <option value="FOB">FOB</option>
                                                <option value="CFR">CFR</option>
                                                <option value="CIF">CIF</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">País Origen</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                                <input
                                                    type="text"
                                                    placeholder="China..."
                                                    value={paisOrigen}
                                                    onChange={(e) => setPaisOrigen(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={isSavingCotizacion}
                                        className="w-full mt-2 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md shadow-indigo-200/50 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingCotizacion ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                                        Agregar Cotización
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Bottom Comment Input — Compose bar estilo chat */}
                    {activeTab === 'comentarios' && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-white">
                            <form onSubmit={handleSendComentario} className="space-y-2">
                                {/* Selector de medio + label */}
                                <div className="flex items-center gap-2">
                                    <select
                                        value={medioId}
                                        onChange={(e) => setMedioId(parseInt(e.target.value))}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none font-bold text-slate-600 cursor-pointer"
                                    >
                                        {catalogos?.medios_gestion.map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                        ))}
                                    </select>
                                    <span className="text-[10px] text-slate-400 font-medium">Medio de contacto</span>
                                </div>
                                {/* Input + botón enviar */}
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Registrar nueva gestión..."
                                        value={comentarioInput}
                                        onChange={(e) => setComentarioInput(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl pl-3.5 pr-12 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSavingComentario || !comentarioInput.trim()}
                                        className="absolute right-1.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.95]"
                                    >
                                        {isSavingComentario ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
