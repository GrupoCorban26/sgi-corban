import React, { useState, useEffect } from 'react';
import { X, KanbanSquare, Plus, Trash2, Ship, Plane, MessageSquare, Loader2, UserSearch, Building2, User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useSeguimientos } from '@/hooks/comercial/useSeguimientos';
import { CotizacionItemCreate, SeguimientoCreate } from '@/types/seguimiento';
import api from '@/lib/axios';

interface ClienteSimple {
    id: number;
    razon_social: string;
    ruc: string | null;
}

interface ModalCrearSeguimientoProps {
    isOpen: boolean;
    onClose: () => void;
    clienteId?: number | null;
    clienteRazonSocial?: string;
    clienteRuc?: string | null;
}

export default function ModalCrearSeguimiento({
    isOpen,
    onClose,
    clienteId,
    clienteRazonSocial,
    clienteRuc
}: ModalCrearSeguimientoProps) {
    const { catalogosQuery, createMutation } = useSeguimientos();
    const catalogos = catalogosQuery.data;

    const [titulo, setTitulo] = useState('');
    const [comentarioInicial, setComentarioInicial] = useState('');
    const [estadoInicial, setEstadoInicial] = useState<'SOLICITUD' | 'COTIZADO'>('COTIZADO');
    const [isLoading, setIsLoading] = useState(false);

    // Modo dropdown (sin clienteId fijo)
    const modoDropdown = !clienteId;
    const [clientesList, setClientesList] = useState<ClienteSimple[]>([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
    const [modoProspecto, setModoProspecto] = useState(false);

    // Campos temporales para prospecto
    const [tempNombre, setTempNombre] = useState('');
    const [tempRuc, setTempRuc] = useState('');
    const [tempContacto, setTempContacto] = useState('');
    const [tempCorreo, setTempCorreo] = useState('');
    const [tempTelefono, setTempTelefono] = useState('');

    // Lista de ítems de cotización iniciales (mínimo 1)
    const [items, setItems] = useState<CotizacionItemCreate[]>([
        { tipo_carga_id: 1, tipo_servicio_id: 1, tipo_operacion: 'IMPORTACION', pais_origen: '' }
    ]);

    // Cargar lista de clientes cuando se abre en modo dropdown
    useEffect(() => {
        if (isOpen && modoDropdown) {
            setLoadingClientes(true);
            api.get<{ data: ClienteSimple[] }>('/clientes?page_size=200')
                .then(res => {
                    const data = res.data.data || [];
                    setClientesList(data);
                })
                .catch(() => {
                    setClientesList([]);
                })
                .finally(() => setLoadingClientes(false));
        }
    }, [isOpen, modoDropdown]);

    useEffect(() => {
        if (isOpen) {
            setTitulo('');
            setComentarioInicial('');
            setEstadoInicial('COTIZADO');
            setItems([{ tipo_carga_id: 1, tipo_servicio_id: 1, tipo_operacion: 'IMPORTACION', pais_origen: '' }]);
            setSelectedClienteId(null);
            setModoProspecto(false);
            setTempNombre('');
            setTempRuc('');
            setTempContacto('');
            setTempCorreo('');
            setTempTelefono('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        setItems([...items, { tipo_carga_id: 1, tipo_servicio_id: 1, tipo_operacion: 'IMPORTACION', pais_origen: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) {
            toast.error('Debe incluir al menos una cotización inicial');
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const handleChangeItem = (index: number, field: keyof CotizacionItemCreate, value: string | number | null) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const handleClienteDropdownChange = (value: string) => {
        if (value === '__nuevo__') {
            setModoProspecto(true);
            setSelectedClienteId(null);
        } else {
            setModoProspecto(false);
            setSelectedClienteId(parseInt(value));
        }
    };

    // Determinar el clienteId final a enviar
    const getClienteIdFinal = (): number | null | undefined => {
        if (clienteId) return clienteId;
        if (modoProspecto) return null;
        return selectedClienteId;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!titulo.trim()) {
            toast.error('Debe registrar un título para el seguimiento');
            return;
        }

        const clienteIdFinal = getClienteIdFinal();

        // Validar que se seleccione un cliente o se ingrese un nombre temporal
        if (modoDropdown && !modoProspecto && !clienteIdFinal) {
            toast.error('Debe seleccionar un cliente o crear un nuevo prospecto');
            return;
        }

        if (modoProspecto && !tempNombre.trim()) {
            toast.error('Debe ingresar al menos el nombre del prospecto');
            return;
        }

        setIsLoading(true);
        try {
            const payload: SeguimientoCreate = {
                cliente_id: clienteIdFinal ?? undefined,
                titulo: titulo.trim(),
                items: items.map(item => ({
                    ...item,
                    pais_origen: item.pais_origen?.trim() || undefined
                })),
                comentario_inicial: comentarioInicial.trim() || undefined,
                estado_inicial: estadoInicial,
                ...(modoProspecto ? {
                    temp_cliente_nombre: tempNombre.trim(),
                    temp_cliente_ruc: tempRuc.trim() || undefined,
                    temp_cliente_contacto: tempContacto.trim() || undefined,
                    temp_cliente_correo: tempCorreo.trim() || undefined,
                    temp_cliente_telefono: tempTelefono.trim() || undefined,
                } : {})
            };

            await createMutation.mutateAsync(payload);
            toast.success('¡Solicitud de cotización creada con éxito!');
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            console.error(error);
            toast.error(error.response?.data?.detail || 'Error al crear la solicitud de cotización');
        } finally {
            setIsLoading(false);
        }
    };

    // Info del cliente para el header
    const headerClienteInfo = (() => {
        if (clienteId) return `${clienteRazonSocial} · RUC ${clienteRuc || 'S/N'}`;
        if (modoProspecto && tempNombre) return `Nuevo Prospecto: ${tempNombre}`;
        if (selectedClienteId) {
            const c = clientesList.find(cl => cl.id === selectedClienteId);
            if (c) return `${c.razon_social} · RUC ${c.ruc || 'S/N'}`;
        }
        return 'Seleccione un cliente o cree un prospecto';
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-white/10 rounded-lg text-white">
                            <KanbanSquare size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-bold">Crear Solicitud de Cotización</h3>
                            <p className="text-xs text-white/80 mt-0.5 truncate max-w-[340px]">
                                {headerClienteInfo}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">

                    {/* Selector de Cliente (solo en modo dropdown) */}
                    {modoDropdown && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Building2 size={13} /> Cliente / Empresa
                                </label>
                                <select
                                    value={modoProspecto ? '__nuevo__' : (selectedClienteId?.toString() || '')}
                                    onChange={(e) => handleClienteDropdownChange(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white text-slate-800 transition-all cursor-pointer"
                                    disabled={loadingClientes}
                                >
                                    <option value="">— Seleccionar cliente —</option>
                                    <option value="__nuevo__" className="font-semibold text-indigo-600">
                                        ✨ Nuevo Prospecto - Sin registrar cliente
                                    </option>
                                    {clientesList.map(c => (
                                        <option key={c.id} value={c.id.toString()}>
                                            {c.razon_social} {c.ruc ? `(${c.ruc})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {loadingClientes && (
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" /> Cargando clientes...
                                    </p>
                                )}
                            </div>

                            {/* Campos Temporales para Prospecto */}
                            {modoProspecto && (
                                <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top duration-200">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                                        <UserSearch size={12} /> Datos del Prospecto (Cliente Temporal)
                                    </p>
                                    <div>
                                        <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">
                                            Razón Social / Nombre *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Nombre de la empresa o contacto"
                                            value={tempNombre}
                                            onChange={(e) => setTempNombre(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">RUC</label>
                                            <input
                                                type="text"
                                                placeholder="20XXXXXXXXX"
                                                maxLength={20}
                                                value={tempRuc}
                                                onChange={(e) => setTempRuc(e.target.value)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400/20 text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                                                <User size={9} /> Contacto
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nombre del contacto"
                                                value={tempContacto}
                                                onChange={(e) => setTempContacto(e.target.value)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400/20 text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                                                <Mail size={9} /> Correo
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="correo@empresa.com"
                                                value={tempCorreo}
                                                onChange={(e) => setTempCorreo(e.target.value)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400/20 text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                                                <Phone size={9} /> Teléfono
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="+51 9XX XXX XXX"
                                                value={tempTelefono}
                                                onChange={(e) => setTempTelefono(e.target.value)}
                                                className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400/20 text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Estado Inicial: Solicitud o Cotizado */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Estado Inicial
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEstadoInicial('COTIZADO')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    estadoInicial === 'COTIZADO'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <KanbanSquare size={14} />
                                Cotización Directa
                            </button>
                            <button
                                type="button"
                                onClick={() => setEstadoInicial('SOLICITUD')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    estadoInicial === 'SOLICITUD'
                                        ? 'bg-slate-600 text-white border-slate-600 shadow-md shadow-slate-200/50'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <UserSearch size={14} />
                                Solicitud
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            {estadoInicial === 'SOLICITUD'
                                ? 'Se creará como solicitud de cotización (seguimiento previo a cotización formal)'
                                : 'Se creará como cotización activa directamente en el pipeline'}
                        </p>
                    </div>
                    
                    {/* Título de la Negociación */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Título del Seguimiento / Carga
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Importación Repuestos de China - Mayo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Lista de Cotizaciones Iniciales */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Cotizaciones Iniciales (Múltiples opciones)
                            </label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-2 py-1 transition-all cursor-pointer"
                            >
                                <Plus size={11} /> Agregar Modalidad
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            {items.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-slate-50/50 border border-slate-200/60 p-3 rounded-2xl space-y-2.5 relative animate-in fade-in duration-150"
                                >
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Eliminar esta opción"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">Tipo Carga</label>
                                            <select
                                                value={item.tipo_carga_id}
                                                onChange={(e) => handleChangeItem(idx, 'tipo_carga_id', parseInt(e.target.value))}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                                            >
                                                {catalogos?.tipos_carga.map(tc => (
                                                    <option key={tc.id} value={tc.id}>{tc.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">Servicio</label>
                                            <select
                                                value={item.tipo_servicio_id}
                                                onChange={(e) => handleChangeItem(idx, 'tipo_servicio_id', parseInt(e.target.value))}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                                            >
                                                {catalogos?.tipos_servicio.map(ts => (
                                                    <option key={ts.id} value={ts.id}>{ts.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">Vía</label>
                                            <select
                                                value={item.tipo_operacion || 'IMPORTACION'}
                                                onChange={(e) => handleChangeItem(idx, 'tipo_operacion', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-800 cursor-pointer font-semibold"
                                            >
                                                <option value="IMPORTACION">IMPORTACIÓN</option>
                                                <option value="EXPORTACION">EXPORTACIÓN</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">País Origen</label>
                                            <input
                                                type="text"
                                                placeholder="China, USA..."
                                                value={item.pais_origen || ''}
                                                onChange={(e) => handleChangeItem(idx, 'pais_origen', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Comentario Inicial */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MessageSquare size={13} /> Comentario de Apertura
                        </label>
                        <textarea
                            rows={2.5}
                            placeholder="Registra los detalles iniciales de la llamada o el requerimiento del cliente..."
                            value={comentarioInicial}
                            onChange={(e) => setComentarioInicial(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white text-slate-800 resize-none transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                            {estadoInicial === 'SOLICITUD' ? 'Crear Solicitud' : 'Crear Cotización'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
