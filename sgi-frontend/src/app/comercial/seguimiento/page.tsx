'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowRightLeft, Users, TrendingUp, TrendingDown, Clock, Target, Ship, PackageCheck, UserSearch, Plus } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import { useSeguimientos } from '@/hooks/comercial/useSeguimientos';
import { Seguimiento, CotizacionCerrar, SeguimientoCaer, SeguimientoMover, SeguimientoOperar, SeguimientoEntregar } from '@/types/seguimiento';
import KanbanBoard from './components/KanbanBoard';
import ModalMoverTarjeta from './components/ModalMoverTarjeta';
import PanelDetalleSeguimiento from './components/PanelDetalleSeguimiento';
import ModalCrearSeguimiento from '@/app/comercial/cartera/components/ModalCrearSeguimiento';
import api from '@/lib/axios';

type EstadoSeguimiento = 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO';

/* Tipo para contactos del cliente */
interface ContactoAlerta {
    id: number;
    nombre: string;
    correo: string | null;
    is_principal: boolean;
}

/* ── Mini KPI Stat ─────────────────────────────────────── */
function KpiStat({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
    return (
        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-sm overflow-hidden`}>
            <div className="opacity-85 flex-shrink-0">{icon}</div>
            <div className="min-w-0 overflow-hidden">
                <p className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider opacity-85 leading-tight truncate" title={label}>{label}</p>
                <p className="text-sm sm:text-base font-extrabold leading-tight tabular-nums mt-0.5">{value}</p>
            </div>
        </div>
    );
}

export default function SeguimientoPage() {
    const { user, isJefeComercial, isAdmin } = useCurrentUser();
    
    // Determinar si el usuario tiene rol supervisor
    const isBoss = isJefeComercial() || isAdmin();

    // Filtros de comercial
    const [comercialId, setComercialId] = useState<number | null>(null);

    // Queries de comerciales y seguimientos
    const { data: comerciales = [], isLoading: loadingComerciales } = useComerciales();
    
    const {
        listQuery,
        catalogosQuery,
        seguimientos,
        isLoading,
        catalogos,
        moverTarjetaMutation,
        cerrarSeguimientoMutation,
        caerSeguimientoMutation,
        registrarComentarioMutation,
        agregarCotizacionMutation,
        operarSeguimientoMutation,
        entregarCargaMutation,
        toggleDocumentoMutation,
        actualizarSeguimientoMutation
    } = useSeguimientos(isBoss ? comercialId : undefined);

    // ── KPIs calculados client-side ──
    const kpis = useMemo(() => {
        const prospectos = seguimientos.filter(s => s.estado === 'SOLICITUD');
        const cotizados = seguimientos.filter(s => s.estado === 'COTIZADO');
        const cerrados = seguimientos.filter(s => s.estado === 'CIERRE');
        const enOperacion = seguimientos.filter(s => s.estado === 'EN_OPERACION');
        const entregadas = seguimientos.filter(s => s.estado === 'CARGA_ENTREGADA');
        const caidos = seguimientos.filter(s => s.estado === 'CAIDO');
        
        // Promedio de días en estado COTIZADO
        const now = new Date().getTime();
        const diasEnCotizado = cotizados.map(s => {
            const created = new Date(s.created_at).getTime();
            return Math.floor((now - created) / (1000 * 60 * 60 * 24));
        });
        const promedioDias = diasEnCotizado.length > 0
            ? Math.round(diasEnCotizado.reduce((a, b) => a + b, 0) / diasEnCotizado.length)
            : 0;

        // Tasa de conversión (cerrados+operacion+entregadas / total finalizados)
        const ganados = cerrados.length + enOperacion.length + entregadas.length;
        const finalizados = ganados + caidos.length;
        const tasaConversion = finalizados > 0 
            ? Math.round((ganados / finalizados) * 100) 
            : 0;

        return {
            prospectos: prospectos.length,
            activos: cotizados.length,
            cerrados: cerrados.length,
            enOperacion: enOperacion.length,
            entregadas: entregadas.length,
            caidos: caidos.length,
            promedioDias,
            tasaConversion
        };
    }, [seguimientos]);

    // Estado para transición/movimiento de tarjeta
    const [isMoverOpen, setIsMoverOpen] = useState(false);
    const [tarjetaAMover, setTarjetaAMover] = useState<Seguimiento | null>(null);
    const [estadoNuevoDestino, setEstadoNuevoDestino] = useState<EstadoSeguimiento>('COTIZADO');

    // Estado para panel lateral deslizable (detalle)
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<Seguimiento | null>(null);

    // Contactos del cliente para el modal EN_OPERACION
    const [contactosCliente, setContactosCliente] = useState<ContactoAlerta[]>([]);

    // Estado para modal crear solicitud
    const [isCrearOpen, setIsCrearOpen] = useState(false);

    // Mover tarjeta (Drag and Drop trigger)
    const handleMoverTarjeta = async (id: number, estadoNuevo: EstadoSeguimiento) => {
        const tarjeta = seguimientos.find(t => t.id === id);
        if (!tarjeta) return;

        setTarjetaAMover(tarjeta);
        setEstadoNuevoDestino(estadoNuevo);

        // Si va a EN_OPERACION, cargar contactos del cliente
        if (estadoNuevo === 'EN_OPERACION') {
            if (!tarjeta.cliente_id) {
                // Prospecto temporal: no puede ir a EN_OPERACION directamente
                toast.error('Debe registrar formalmente al cliente (vía CIERRE) antes de pasar a operación');
                return;
            }
            try {
                const { data } = await api.get(`/clientes/${tarjeta.cliente_id}/contactos`);
                setContactosCliente(
                    (data || []).map((c: { id: number; nombre_contacto?: string; nombre?: string; correo: string | null; is_principal: boolean }) => ({
                        id: c.id,
                        nombre: c.nombre || c.nombre_contacto || '',
                        correo: c.correo,
                        is_principal: c.is_principal || false
                    }))
                );
            } catch {
                setContactosCliente([]);
            }
        } else {
            setContactosCliente([]);
        }
        
        setIsMoverOpen(true);
    };

    // Callback de confirmación del modal de transición
    const handleConfirmMover = async (payload: CotizacionCerrar | SeguimientoCaer | SeguimientoMover | SeguimientoOperar | SeguimientoEntregar) => {
        if (!tarjetaAMover) return;

        if (estadoNuevoDestino === 'CIERRE') {
            await cerrarSeguimientoMutation.mutateAsync({
                id: tarjetaAMover.id,
                data: payload as CotizacionCerrar
            });
        } else if (estadoNuevoDestino === 'CAIDO') {
            await caerSeguimientoMutation.mutateAsync({
                id: tarjetaAMover.id,
                data: payload as SeguimientoCaer
            });
        } else if (estadoNuevoDestino === 'EN_OPERACION') {
            await operarSeguimientoMutation.mutateAsync({
                id: tarjetaAMover.id,
                data: payload as SeguimientoOperar
            });
        } else if (estadoNuevoDestino === 'CARGA_ENTREGADA') {
            await entregarCargaMutation.mutateAsync({
                id: tarjetaAMover.id,
                data: payload as SeguimientoEntregar
            });
        } else {
            await moverTarjetaMutation.mutateAsync({
                id: tarjetaAMover.id,
                data: payload as SeguimientoMover
            });
        }
        
        // Si el panel de detalle estaba abierto, refrescar el estado local
        if (isPanelOpen && tarjetaSeleccionada?.id === tarjetaAMover.id) {
            const updated = seguimientos.find(t => t.id === tarjetaAMover.id);
            if (updated) setTarjetaSeleccionada(updated);
        }
    };

    // Al seleccionar una tarjeta, abrir el Panel Lateral
    const handleSeleccionarTarjeta = (seg: Seguimiento) => {
        setTarjetaSeleccionada(seg);
        setIsPanelOpen(true);
    };

    const handleRegistrarComentario = async (payload: { comentario: string; medioGestionId?: number }) => {
        if (!tarjetaSeleccionada) return;
        return await registrarComentarioMutation.mutateAsync({
            id: tarjetaSeleccionada.id,
            comentario: payload.comentario,
            medioGestionId: payload.medioGestionId
        });
    };

    const handleAgregarCotizacion = async (payload: { tipo_carga_id: number; tipo_servicio_id: number; tipo_operacion?: string | null; pais_origen?: string | null; incoterm?: string | null }) => {
        if (!tarjetaSeleccionada) return;
        return await agregarCotizacionMutation.mutateAsync({
            id: tarjetaSeleccionada.id,
            data: payload
        });
    };

    const handleToggleDocumento = async (docRelId: number, completado: boolean) => {
        if (!tarjetaSeleccionada) return;
        await toggleDocumentoMutation.mutateAsync({
            id: tarjetaSeleccionada.id,
            docRelId,
            data: { completado }
        });
    };

    const handleActualizarSeguimiento = async (payload: any) => {
        if (!tarjetaSeleccionada) return;
        return await actualizarSeguimientoMutation.mutateAsync({
            id: tarjetaSeleccionada.id,
            data: payload
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
                
                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <span className="p-1.5 sm:p-2 bg-indigo-50 rounded-xl border border-indigo-100/50 shadow-sm flex-shrink-0">
                                <ArrowRightLeft size={18} />
                            </span>
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight truncate">
                                Seguimiento de Cargas
                            </h1>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 pl-1 line-clamp-1 sm:line-clamp-none">
                            {isBoss 
                                ? 'Monitoreo global · Visualiza y filtra el pipeline comercial de todos los equipos' 
                                : 'Usa los botones de acción o arrastra tarjetas para gestionar cierres y descalificaciones'}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Filtro por comercial (Supervisores / Directores) */}
                        {isBoss && (
                            <div className="flex items-center gap-2 bg-white px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                <Users size={15} className="text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-500 font-bold mr-1 hidden sm:inline">Filtrar:</span>
                                <select
                                    value={comercialId || ''}
                                    onChange={(e) => setComercialId(e.target.value ? parseInt(e.target.value) : null)}
                                    disabled={loadingComerciales}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 cursor-pointer flex-1 sm:min-w-[160px]"
                                >
                                    <option value="">Todos los comerciales</option>
                                    {comerciales.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Botón Crear Solicitud */}
                        <button
                            onClick={() => setIsCrearOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                        >
                            <Plus size={14} />
                            <span>Crear solicitud</span>
                        </button>
                    </div>
                </div>

                {/* ── KPI Strip (8 estados/métricas con Prospecto incluido) ──────────────────────── */}
                {!isLoading && seguimientos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
                        <KpiStat 
                            icon={<UserSearch size={16} />} 
                            label="Prospectos" 
                            value={kpis.prospectos} 
                            color="from-slate-500 to-slate-600" 
                        />
                        <KpiStat 
                            icon={<Target size={16} />} 
                            label="Cotizados" 
                            value={kpis.activos} 
                            color="from-indigo-500 to-indigo-600" 
                        />
                        <KpiStat 
                            icon={<TrendingUp size={16} />} 
                            label="Cerrados (COR)" 
                            value={kpis.cerrados} 
                            color="from-emerald-500 to-emerald-600" 
                        />
                        <KpiStat 
                            icon={<Ship size={16} />} 
                            label="En Operación" 
                            value={kpis.enOperacion} 
                            color="from-blue-500 to-blue-600" 
                        />
                        <KpiStat 
                            icon={<PackageCheck size={16} />} 
                            label="Entregados" 
                            value={kpis.entregadas} 
                            color="from-violet-500 to-violet-600" 
                        />
                        <KpiStat 
                            icon={<TrendingDown size={16} />} 
                            label="Caídos" 
                            value={kpis.caidos} 
                            color="from-rose-500 to-rose-600" 
                        />
                        <KpiStat 
                            icon={<Clock size={16} />} 
                            label="Prom. días" 
                            value={`${kpis.promedioDias}d`} 
                            color="from-amber-500 to-amber-600" 
                        />
                        <KpiStat 
                            icon={<TrendingUp size={16} />} 
                            label="Tasa conversión" 
                            value={`${kpis.tasaConversion}%`} 
                            color={kpis.tasaConversion >= 50 ? 'from-emerald-500 to-teal-600' : kpis.tasaConversion >= 30 ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600'} 
                        />
                    </div>
                )}

                {/* Tablero Kanban */}
                <KanbanBoard
                    seguimientos={seguimientos}
                    onMoverTarjeta={handleMoverTarjeta}
                    onSeleccionarTarjeta={handleSeleccionarTarjeta}
                    isLoading={isLoading}
                    refetch={listQuery.refetch}
                />

            </div>

            {/* Modal de Transición de Estados */}
            {isMoverOpen && tarjetaAMover && (
                <ModalMoverTarjeta
                    isOpen={isMoverOpen}
                    onClose={() => { setIsMoverOpen(false); setTarjetaAMover(null); setContactosCliente([]); }}
                    seguimiento={tarjetaAMover}
                    estadoNuevo={estadoNuevoDestino}
                    catalogos={catalogos}
                    contactos={contactosCliente}
                    onConfirmMover={handleConfirmMover}
                />
            )}

            {/* Panel Deslizable Lateral Detalle */}
            {isPanelOpen && tarjetaSeleccionada && (
                <PanelDetalleSeguimiento
                    isOpen={isPanelOpen}
                    onClose={() => { setIsPanelOpen(false); setTarjetaSeleccionada(null); }}
                    seguimiento={tarjetaSeleccionada}
                    catalogos={catalogos}
                    onRegistrarComentario={handleRegistrarComentario}
                    onAgregarCotizacion={handleAgregarCotizacion}
                    onReactivar={() => handleMoverTarjeta(tarjetaSeleccionada.id, 'COTIZADO')}
                    onToggleDocumento={handleToggleDocumento}
                    onActualizarSeguimiento={handleActualizarSeguimiento}
                />
            )}

            {/* Modal Crear Solicitud de Cotización */}
            <ModalCrearSeguimiento
                isOpen={isCrearOpen}
                onClose={() => setIsCrearOpen(false)}
            />
        </div>
    );
}
