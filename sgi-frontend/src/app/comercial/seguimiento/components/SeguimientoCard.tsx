import React from 'react';
import { Ship, Plane, Calendar, User, AlertCircle, Clock, FileCheck, Anchor } from 'lucide-react';
import { Seguimiento } from '@/types/seguimiento';

interface SeguimientoCardProps {
    seguimiento: Seguimiento;
    onClick: () => void;
}

export default function SeguimientoCard({ seguimiento, onClick }: SeguimientoCardProps) {
    
    // Calcular días de antigüedad
    const getDiasAntiguedad = (dateStr: string) => {
        const created = new Date(dateStr);
        const hoy = new Date();
        const diff = hoy.getTime() - created.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const dias = getDiasAntiguedad(seguimiento.created_at);

    // Días restantes al ETA
    const diasRestantesEta = seguimiento.fecha_eta
        ? Math.ceil((new Date(seguimiento.fecha_eta).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Progreso de documentos
    const documentos = seguimiento.documentos || [];
    const docsCompletados = documentos.filter(d => d.completado).length;
    const docsTotales = documentos.length;

    // Semáforo de antigüedad — barra lateral + badge
    const getSemaforoBorder = (d: number) => {
        if (seguimiento.estado === 'CARGA_ENTREGADA') return 'border-l-violet-500';
        if (seguimiento.estado === 'EN_OPERACION') {
            if (diasRestantesEta !== null && diasRestantesEta <= 7) return 'border-l-rose-500';
            if (diasRestantesEta !== null && diasRestantesEta <= 14) return 'border-l-amber-400';
            return 'border-l-blue-500';
        }
        if (seguimiento.estado === 'CIERRE') return 'border-l-emerald-500';
        if (seguimiento.estado === 'CAIDO') return 'border-l-slate-300';
        if (seguimiento.estado === 'SOLICITUD') return 'border-l-slate-400';
        if (d >= 10) return 'border-l-rose-500';
        if (d >= 5) return 'border-l-amber-400';
        return 'border-l-indigo-400';
    };

    const getSemaforoBadge = (d: number) => {
        if (seguimiento.estado === 'CARGA_ENTREGADA') return 'bg-violet-50 text-violet-700 border-violet-200';
        if (seguimiento.estado === 'EN_OPERACION') {
            if (diasRestantesEta !== null && diasRestantesEta <= 7) return 'bg-rose-50 text-rose-700 border-rose-200';
            if (diasRestantesEta !== null && diasRestantesEta <= 14) return 'bg-amber-50 text-amber-700 border-amber-200';
            return 'bg-blue-50 text-blue-700 border-blue-200';
        }
        if (seguimiento.estado === 'CIERRE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (seguimiento.estado === 'CAIDO') return 'bg-slate-50 text-slate-500 border-slate-200';
        if (seguimiento.estado === 'SOLICITUD') return 'bg-slate-50 text-slate-600 border-slate-200';
        if (d >= 10) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (d >= 5) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-sky-50 text-sky-700 border-sky-200';
    };

    const getBadgeText = () => {
        if (seguimiento.estado === 'CARGA_ENTREGADA') return '✓ Entregado';
        if (seguimiento.estado === 'EN_OPERACION') {
            if (diasRestantesEta !== null) return `ETA ${diasRestantesEta}d`;
            return 'En Op.';
        }
        if (seguimiento.estado === 'CIERRE') return 'Ganado';
        if (seguimiento.estado === 'CAIDO') return 'Perdido';
        if (seguimiento.estado === 'SOLICITUD') return `${dias}d`;
        return `${dias}d activo`;
    };

    // Incoterm de la cotización aceptada
    const cotAceptada = seguimiento.cotizaciones?.find(c => c.estado === 'ACEPTADO');
    const incoterm = cotAceptada?.incoterm;

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', seguimiento.id.toString());
        const target = e.currentTarget as HTMLElement;
        target.classList.add('opacity-40', 'scale-[0.97]');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('opacity-40', 'scale-[0.97]');
    };

    return (
        <div
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            className={`group relative bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none border-l-[4px] ${getSemaforoBorder(dias)}`}
        >
            
            {/* Cabecera: RUC + Semáforo */}
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wide flex-shrink-0">
                        RUC {seguimiento.cliente_ruc || 'S/N'}
                    </span>
                    
                    {/* Badge de Antigüedad / Estado */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border flex-shrink-0 whitespace-nowrap ${getSemaforoBadge(dias)}`}>
                        {seguimiento.estado === 'COTIZADO' && dias >= 10 && <AlertCircle size={10} />}
                        {seguimiento.estado === 'EN_OPERACION' && <Clock size={10} />}
                        {getBadgeText()}
                    </span>
                </div>

                {/* Razón Social — más prominente */}
                <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors" title={seguimiento.cliente_razon_social || undefined}>
                    {seguimiento.cliente_razon_social}
                </h4>
                
                {/* Título del embarque */}
                <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/60" title={seguimiento.titulo || undefined}>
                    {seguimiento.titulo}
                </p>
            </div>

            {/* Modalidades de cotización */}
            <div className="mt-3.5 space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modalidades:</span>
                
                <div className="flex flex-wrap gap-1.5">
                    {seguimiento.cotizaciones.map((c) => {
                        const isAereo = c.tipo_carga_nombre?.toUpperCase().includes('AEREO') || c.tipo_carga_nombre?.toUpperCase().includes('COURIER');
                        
                        return (
                            <span 
                                key={c.id} 
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
                                    c.estado === 'ACEPTADO' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-200' 
                                        : c.estado === 'RECHAZADO'
                                        ? 'bg-rose-50/60 text-rose-500 border-rose-200 line-through opacity-60'
                                        : c.estado === 'DESCARTADO'
                                        ? 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-50'
                                        : 'bg-indigo-50/50 text-indigo-700 border-indigo-100'
                                }`}
                                title={`${c.tipo_carga_nombre} · ${c.tipo_servicio_nombre} (${c.estado})`}
                            >
                                {isAereo ? <Plane size={11} className="flex-shrink-0" /> : <Ship size={11} className="flex-shrink-0" />}
                                <span className="truncate max-w-[120px]">{c.tipo_carga_nombre}</span>
                                {c.pais_origen && <span className="opacity-60 font-normal text-[9px]">({c.pais_origen})</span>}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Incoterm + Documentos (para estados operativos) */}
            {(seguimiento.estado === 'EN_OPERACION' || seguimiento.estado === 'CARGA_ENTREGADA') && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {incoterm && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-extrabold font-mono border border-slate-200 whitespace-nowrap">
                            <Anchor size={9} className="flex-shrink-0" /> {incoterm}
                        </span>
                    )}
                    {docsTotales > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold border whitespace-nowrap ${
                            docsCompletados === docsTotales
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                            <FileCheck size={9} className="flex-shrink-0" />
                            {docsCompletados}/{docsTotales} docs
                        </span>
                    )}
                </div>
            )}

            {/* Footer: Comercial / Fecha */}
            <div className="mt-4 pt-3 border-t border-slate-100/70 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-500 truncate max-w-[130px]" title={seguimiento.comercial_nombre || 'Comercial'}>
                    <User size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{seguimiento.comercial_nombre || 'Comercial'}</span>
                </span>
                
                <span className="flex items-center gap-1.5 font-mono text-slate-400 flex-shrink-0">
                    <Calendar size={12} className="flex-shrink-0" />
                    {new Date(seguimiento.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })}
                </span>
            </div>
        </div>
    );
}
