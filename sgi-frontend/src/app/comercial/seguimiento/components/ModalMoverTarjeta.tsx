import React, { useState, useMemo } from 'react';
import { X, Calendar, DollarSign, Tag, CheckSquare, MessageSquare, AlertTriangle, Ship, PackageCheck, FileText, UserCheck, Anchor, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Seguimiento, SeguimientoCatalogos, CotizacionCerrar, SeguimientoCaer, SeguimientoMover, SeguimientoOperar, SeguimientoEntregar, DocumentoOperacional, ClienteRegistroFaseCierre } from '@/types/seguimiento';

type EstadoSeguimiento = 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO';

interface ContactoAlerta {
    id: number;
    nombre: string;
    correo: string | null;
    is_principal: boolean;
}

const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'] as const;

interface ModalMoverTarjetaProps {
    isOpen: boolean;
    onClose: () => void;
    seguimiento: Seguimiento;
    estadoNuevo: EstadoSeguimiento;
    catalogos: SeguimientoCatalogos | undefined;
    contactos?: ContactoAlerta[];
    onConfirmMover: (payload: CotizacionCerrar | SeguimientoCaer | SeguimientoMover | SeguimientoOperar | SeguimientoEntregar) => Promise<void>;
}

export default function ModalMoverTarjeta({
    isOpen,
    onClose,
    seguimiento,
    estadoNuevo,
    catalogos,
    contactos = [],
    onConfirmMover
}: ModalMoverTarjetaProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Campos comunes
    const [medioId, setMedioId] = useState<number>(1); // Default a Llamada o 1
    const [comentario, setComentario] = useState<string>('');
    const [fechaCambio, setFechaCambio] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    // Campos para CIERRE
    const [cotizacionId, setCotizacionId] = useState<number | null>(
        seguimiento.cotizaciones.filter(c => c.estado === 'PENDIENTE')[0]?.id || null
    );
    const [codigoOperacion, setCodigoOperacion] = useState<string>('');
    const [segmentacionId, setSegmentacionId] = useState<number>(3); // Default a META o 3

    // Campos para registro de cliente en CIERRE (cuando es prospecto temporal)
    const esProspectoTemporal = seguimiento.cliente_id === null;
    const [regRuc, setRegRuc] = useState<string>(seguimiento.temp_cliente_ruc || '');
    const [regRazonSocial, setRegRazonSocial] = useState<string>(seguimiento.temp_cliente_nombre || '');
    const [regDireccion, setRegDireccion] = useState<string>('');
    const [regDistritoId, setRegDistritoId] = useState<number>(1);
    const [regOrigenId, setRegOrigenId] = useState<number>(1);

    // Campos para CAIDO
    const [motivoCaida, setMotivoCaida] = useState<string>('');

    // Campos para EN_OPERACION
    const [fechaEta, setFechaEta] = useState<string>('');
    const cotizacionAceptada = useMemo(() =>
        seguimiento.cotizaciones.find(c => c.estado === 'ACEPTADO'),
        [seguimiento.cotizaciones]
    );
    const [incoterm, setIncoterm] = useState<string>(cotizacionAceptada?.incoterm || 'FOB');
    const contactoPrincipal = useMemo(() =>
        contactos.find(c => c.is_principal) || contactos[0],
        [contactos]
    );
    const [contactoAlertaId, setContactoAlertaId] = useState<number>(contactoPrincipal?.id || 0);
    const [documentoIds, setDocumentoIds] = useState<number[]>([]);

    if (!isOpen) return null;

    const toggleDocumento = (docId: number) => {
        setDocumentoIds(prev =>
            prev.includes(docId)
                ? prev.filter(d => d !== docId)
                : [...prev, docId]
        );
    };

    const documentosOperacionales: DocumentoOperacional[] = catalogos?.documentos_operacionales?.filter(d => d.is_active) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (estadoNuevo === 'CIERRE') {
            if (!cotizacionId) {
                toast.error('Debe seleccionar la cotización que fue aceptada');
                return;
            }
            if (!codigoOperacion.trim()) {
                toast.error('Debe registrar el código de operación (COR) de SISPAC');
                return;
            }
            if (!segmentacionId) {
                toast.error('Debe seleccionar el origen de segmentación del cierre');
                return;
            }
            // Validar registro de cliente si es prospecto temporal
            if (esProspectoTemporal) {
                if (!regRuc.trim() || regRuc.trim().length !== 11) {
                    toast.error('El RUC debe tener exactamente 11 dígitos');
                    return;
                }
                if (!regRazonSocial.trim()) {
                    toast.error('Debe ingresar la razón social del cliente');
                    return;
                }
                if (!regDireccion.trim()) {
                    toast.error('Debe ingresar la dirección fiscal del cliente');
                    return;
                }
            }

            setIsLoading(true);
            try {
                const clienteRegistro: ClienteRegistroFaseCierre | undefined = esProspectoTemporal ? {
                    ruc: regRuc.trim(),
                    razon_social: regRazonSocial.trim(),
                    direccion_fiscal: regDireccion.trim(),
                    distrito_id: regDistritoId,
                    origen_id: regOrigenId
                } : undefined;

                const payload: CotizacionCerrar = {
                    cotizacion_id: cotizacionId,
                    codigo_operacion: codigoOperacion.trim().toUpperCase(),
                    segmentacion_id: segmentacionId,
                    medio_gestion_id: medioId,
                    comentario: comentario.trim() || undefined,
                    cliente_registro: clienteRegistro,
                    fecha_cambio: fechaCambio || undefined
                };
                await onConfirmMover(payload);
                toast.success('¡Negociación cerrada con éxito!');
                onClose();
            } catch (err: unknown) {
                const error = err as { response?: { data?: { detail?: string } } };
                console.error(error);
                toast.error(error.response?.data?.detail || 'Error al cerrar el seguimiento');
            } finally {
                setIsLoading(false);
            }
        } else if (estadoNuevo === 'CAIDO') {
            if (!motivoCaida.trim()) {
                toast.error('Debe ingresar el motivo por el cual se cayó la negociación');
                return;
            }

            setIsLoading(true);
            try {
                const payload: SeguimientoCaer = {
                    motivo_caida: motivoCaida.trim(),
                    medio_gestion_id: medioId,
                    comentario: comentario.trim() || undefined,
                    fecha_cambio: fechaCambio || undefined
                };
                await onConfirmMover(payload);
                toast.warning('Negociación marcada como caída');
                onClose();
            } catch (err: unknown) {
                const error = err as { response?: { data?: { detail?: string } } };
                console.error(error);
                toast.error(error.response?.data?.detail || 'Error al marcar como caído');
            } finally {
                setIsLoading(false);
            }
        } else if (estadoNuevo === 'EN_OPERACION') {
            if (!fechaEta) {
                toast.error('Debe ingresar la fecha ETA estimada');
                return;
            }
            if (!incoterm) {
                toast.error('Debe seleccionar un Incoterm');
                return;
            }
            if (documentoIds.length === 0) {
                toast.error('Debe seleccionar al menos un documento operacional');
                return;
            }
            if (!contactoAlertaId) {
                toast.error('Debe seleccionar un contacto para alertas');
                return;
            }

            setIsLoading(true);
            try {
                const payload: SeguimientoOperar = {
                    fecha_eta: fechaEta,
                    incoterm: incoterm,
                    documento_ids: documentoIds,
                    contacto_alerta_id: contactoAlertaId,
                    medio_gestion_id: medioId,
                    comentario: comentario.trim() || undefined,
                    fecha_cambio: fechaCambio || undefined
                };
                await onConfirmMover(payload);
                toast.success('🚢 Operación iniciada correctamente');
                onClose();
            } catch (err: unknown) {
                const error = err as { response?: { data?: { detail?: string } } };
                console.error(error);
                toast.error(error.response?.data?.detail || 'Error al iniciar la operación');
            } finally {
                setIsLoading(false);
            }
        } else if (estadoNuevo === 'CARGA_ENTREGADA') {
            setIsLoading(true);
            try {
                const payload: SeguimientoEntregar = {
                    medio_gestion_id: medioId,
                    comentario: comentario.trim() || undefined,
                    fecha_cambio: fechaCambio || undefined
                };
                await onConfirmMover(payload);
                toast.success('📦 Carga entregada correctamente');
                onClose();
            } catch (err: unknown) {
                const error = err as { response?: { data?: { detail?: string } } };
                console.error(error);
                toast.error(error.response?.data?.detail || 'Error al registrar la entrega');
            } finally {
                setIsLoading(false);
            }
        } else {
            // COTIZADO (Reactivación desde CAIDO o desde CIERRE, o SOLICITUD→COTIZADO)
            setIsLoading(true);
            try {
                const payload: SeguimientoMover = {
                    estado_nuevo: estadoNuevo as 'SOLICITUD' | 'COTIZADO' | 'CIERRE' | 'EN_OPERACION' | 'CARGA_ENTREGADA' | 'CAIDO',
                    medio_gestion_id: medioId,
                    comentario: comentario.trim() || undefined,
                    fecha_cambio: fechaCambio || undefined
                };
                await onConfirmMover(payload);
                toast.success(
                    estadoNuevo === 'COTIZADO' && seguimiento.estado === 'SOLICITUD'
                        ? 'Solicitud promovida a cotización'
                        : 'Seguimiento reactivado correctamente'
                );
                onClose();
            } catch (err: unknown) {
                const error = err as { response?: { data?: { detail?: string } } };
                console.error(error);
                toast.error(error.response?.data?.detail || 'Error al mover el seguimiento');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const cotizacionesPendientes = seguimiento.cotizaciones.filter(c => c.estado === 'PENDIENTE');

    // Color scheme por estado destino
    const getHeaderGradient = () => {
        switch (estadoNuevo) {
            case 'CIERRE': return 'bg-gradient-to-r from-emerald-500 to-green-600';
            case 'CAIDO': return 'bg-gradient-to-r from-rose-500 to-red-600';
            case 'EN_OPERACION': return 'bg-gradient-to-r from-blue-500 to-blue-700';
            case 'CARGA_ENTREGADA': return 'bg-gradient-to-r from-violet-500 to-purple-600';
            case 'COTIZADO': return 'bg-gradient-to-r from-indigo-500 to-blue-600';
            default: return 'bg-gradient-to-r from-slate-500 to-slate-600';
        }
    };

    const getHeaderTitle = () => {
        switch (estadoNuevo) {
            case 'CIERRE': return '🏆 Registrar Cierre Exitoso';
            case 'CAIDO': return '⚠️ Registrar Negociación Caída';
            case 'EN_OPERACION': return '🚢 Iniciar Operación';
            case 'CARGA_ENTREGADA': return '📦 Registrar Entrega de Carga';
            case 'COTIZADO':
                return seguimiento.estado === 'SOLICITUD' ? '📋 Promover a Cotización' : '🔄 Reactivar Negociación';
            default: return '🔄 Mover Seguimiento';
        }
    };

    const getButtonColor = () => {
        switch (estadoNuevo) {
            case 'CIERRE': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200';
            case 'CAIDO': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-200';
            case 'EN_OPERACION': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
            case 'CARGA_ENTREGADA': return 'bg-violet-600 hover:bg-violet-700 shadow-violet-200';
            default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
        }
    };

    const isSubmitDisabled = () => {
        if (isLoading) return true;
        if (estadoNuevo === 'CIERRE' && cotizacionesPendientes.length === 0) return true;
        if (estadoNuevo === 'EN_OPERACION' && (!fechaEta || !incoterm || documentoIds.length === 0 || !contactoAlertaId)) return true;
        return false;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                
                {/* Modal Header */}
                <div className={`px-6 py-5 flex items-center justify-between text-white ${getHeaderGradient()}`}>
                    <div>
                        <h3 className="text-lg font-bold">{getHeaderTitle()}</h3>
                        <p className="text-xs text-white/80 mt-0.5 max-w-[360px] truncate">
                            {seguimiento.cliente_razon_social} · {seguimiento.titulo}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form (scrollable) */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    
                    {/* Sección CIERRE */}
                    {estadoNuevo === 'CIERRE' && (
                        <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 animate-in slide-in-from-top duration-200">
                            <div>
                                <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <CheckSquare size={13} /> Seleccionar Cotización Aceptada
                                </label>
                                {cotizacionesPendientes.length === 0 ? (
                                    <p className="text-sm text-red-600 font-medium italic">No hay cotizaciones pendientes asociadas a este seguimiento.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {cotizacionesPendientes.map((c) => (
                                            <label 
                                                key={c.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                                                    cotizacionId === c.id 
                                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 font-semibold shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input 
                                                        type="radio" 
                                                        name="cotizacion_aceptada"
                                                        value={c.id}
                                                        checked={cotizacionId === c.id}
                                                        onChange={() => setCotizacionId(c.id)}
                                                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                                                    />
                                                    <div>
                                                        <span className="font-bold">{c.tipo_carga_nombre}</span>
                                                        <span className="text-slate-400 font-normal ml-1">· {c.tipo_servicio_nombre}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                                    {c.tipo_operacion || 'Carga'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <DollarSign size={13} /> Código COR (SISPAC)
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="COR-5674"
                                        value={codigoOperacion}
                                        onChange={(e) => setCodigoOperacion(e.target.value)}
                                        className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 uppercase font-mono tracking-wider transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Tag size={13} /> Atribución de Cierre
                                    </label>
                                    <select
                                        value={segmentacionId}
                                        onChange={(e) => setSegmentacionId(parseInt(e.target.value))}
                                        className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 cursor-pointer transition-all"
                                    >
                                        {catalogos?.segmentaciones_cierre.map((sc) => (
                                            <option key={sc.id} value={sc.id}>{sc.nombre.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Registro de Cliente Formal (solo si es prospecto temporal) */}
                            {esProspectoTemporal && (
                                <div className="mt-3 bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 space-y-3 animate-in slide-in-from-top duration-200">
                                    <div className="flex items-center gap-1.5 text-amber-800">
                                        <Building2 size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Registrar Cliente Formal en Cartera</span>
                                    </div>
                                    <p className="text-[10px] text-amber-700">
                                        Este seguimiento fue creado sin cliente formal. Para cerrar la venta, debe registrar los datos fiscales del cliente.
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">RUC (11 dígitos) *</label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={11}
                                                placeholder="20XXXXXXXXX"
                                                value={regRuc}
                                                onChange={(e) => setRegRuc(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800 font-mono tracking-wider"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">Razón Social *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Empresa S.A.C."
                                                value={regRazonSocial}
                                                onChange={(e) => setRegRazonSocial(e.target.value)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                                            <MapPin size={9} /> Dirección Fiscal *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Av. Principal 123, Lima"
                                            value={regDireccion}
                                            onChange={(e) => setRegDireccion(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">Distrito</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={regDistritoId}
                                                onChange={(e) => setRegDistritoId(parseInt(e.target.value) || 1)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">Origen Cliente</label>
                                            <select
                                                value={regOrigenId}
                                                onChange={(e) => setRegOrigenId(parseInt(e.target.value))}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800 cursor-pointer"
                                            >
                                                {catalogos?.segmentaciones_cierre.map((sc) => (
                                                    <option key={sc.id} value={sc.id}>{sc.nombre.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sección EN_OPERACION */}
                    {estadoNuevo === 'EN_OPERACION' && (
                        <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 animate-in slide-in-from-top duration-200">
                            
                            {/* Fecha ETA + Incoterm */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Calendar size={13} /> Fecha ETA Estimada
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={fechaEta}
                                        onChange={(e) => setFechaEta(e.target.value)}
                                        className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Anchor size={13} /> Incoterm
                                    </label>
                                    <select
                                        value={incoterm}
                                        onChange={(e) => setIncoterm(e.target.value)}
                                        className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 cursor-pointer font-mono font-bold transition-all"
                                    >
                                        {INCOTERMS.map(term => (
                                            <option key={term} value={term}>{term}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Contacto de Alerta */}
                            <div>
                                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <UserCheck size={13} /> Contacto para Alertas
                                </label>
                                {contactos.length === 0 ? (
                                    <p className="text-sm text-amber-600 font-medium italic bg-amber-50 p-2 rounded-xl border border-amber-100">
                                        No hay contactos registrados para este cliente. Registre al menos uno antes de continuar.
                                    </p>
                                ) : (
                                    <select
                                        value={contactoAlertaId}
                                        onChange={(e) => setContactoAlertaId(parseInt(e.target.value))}
                                        className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 cursor-pointer transition-all"
                                    >
                                        <option value={0} disabled>Seleccionar contacto...</option>
                                        {contactos.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.nombre} {c.correo ? `(${c.correo})` : ''} {c.is_principal ? '★ Principal' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Documentos Operacionales */}
                            <div>
                                <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <FileText size={13} /> Documentos a Tramitar
                                    <span className="text-blue-500 font-normal normal-case ml-1">(seleccione al menos 1)</span>
                                </label>
                                {documentosOperacionales.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">No hay documentos operacionales configurados.</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {documentosOperacionales.map(doc => (
                                            <label
                                                key={doc.id}
                                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-sm cursor-pointer transition-all ${
                                                    documentoIds.includes(doc.id)
                                                        ? 'bg-blue-500/10 border-blue-400 text-blue-900 font-semibold'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={documentoIds.includes(doc.id)}
                                                    onChange={() => toggleDocumento(doc.id)}
                                                    className="accent-blue-600 w-4 h-4 cursor-pointer rounded"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-semibold">{doc.nombre}</span>
                                                    {doc.descripcion && (
                                                        <span className="text-[10px] text-slate-400 ml-1.5">{doc.descripcion}</span>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {documentoIds.length > 0 && (
                                    <p className="text-[10px] text-blue-600 font-bold mt-1.5">
                                        {documentoIds.length} documento{documentoIds.length !== 1 ? 's' : ''} seleccionado{documentoIds.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sección CARGA_ENTREGADA */}
                    {estadoNuevo === 'CARGA_ENTREGADA' && (
                        <div className="space-y-3 bg-violet-50/50 p-4 rounded-2xl border border-violet-100/50 animate-in slide-in-from-top duration-200">
                            <div className="flex items-center gap-2 text-violet-700">
                                <PackageCheck size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Confirmar entrega de carga</span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Se registrará la entrega exitosa de la carga al cliente. Puede agregar un comentario adicional abajo.
                            </p>
                        </div>
                    )}

                    {/* Sección CAIDO */}
                    {estadoNuevo === 'CAIDO' && (
                        <div className="space-y-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50 animate-in slide-in-from-top duration-200">
                            <div>
                                <label className="block text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <AlertTriangle size={13} /> Motivo de Pérdida
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Explica detalladamente por qué se cayó la negociación (ej: precio muy alto, cliente eligió naviera propia, etc.)..."
                                    value={motivoCaida}
                                    onChange={(e) => setMotivoCaida(e.target.value)}
                                    className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 text-slate-800 resize-none transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    )}

                    {/* Sección COTIZADO (Prospecto→Cotizado o reactivación) */}
                    {estadoNuevo === 'COTIZADO' && seguimiento.estado !== 'COTIZADO' && (
                        <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-in slide-in-from-top duration-200">
                            <div className="flex items-center gap-2 text-indigo-700">
                                <Ship size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {seguimiento.estado === 'SOLICITUD' ? 'Promover solicitud a cotización' : 'Reactivar negociación'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {seguimiento.estado === 'SOLICITUD'
                                    ? 'La solicitud será promovida al pipeline de cotizaciones activas.'
                                    : 'Se reactivará la negociación para volver a gestionarla comercialmente.'
                                }
                            </p>
                        </div>
                    )}

                    {/* Canal, Comentario y Fecha Comunes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar size={13} /> Fecha de Transición
                            </label>
                            <input
                                type="date"
                                required
                                value={fechaCambio}
                                onChange={(e) => setFechaCambio(e.target.value)}
                                className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-800 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar size={13} /> Vía de Gestión Comercial
                            </label>
                            <select
                                value={medioId}
                                onChange={(e) => setMedioId(parseInt(e.target.value))}
                                className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-800 cursor-pointer transition-all"
                            >
                                {catalogos?.medios_gestion.map((m) => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <MessageSquare size={13} /> Nota Adicional
                            </label>
                            <input
                                type="text"
                                placeholder="Comentarios u observaciones extras..."
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                className="w-full bg-white border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-800 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitDisabled()}
                            className={`px-6 py-2 text-white rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
                        >
                            {isLoading ? 'Registrando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
