'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Building2,
  Users,
  UserCheck,
  UserMinus,
  Edit2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Truck,
  UserPlus,
  ClipboardList,
  MoreHorizontal,
  Archive,
  PackageCheck,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useClientes, useClientesStats } from '@/hooks/comercial/useClientes';
import { Cliente } from '@/types/cliente';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import ModalCliente from './components/modal-cliente';
import ModalRegistrarGestion from './components/ModalRegistrarGestion';
import ModalTimeline from './components/ModalTimeline';

const ESTADO_COLORS: Record<string, string> = {
  'PROSPECTO': 'bg-sky-50 text-sky-700 ring-sky-200',
  'EN_NEGOCIACION': 'bg-amber-50 text-amber-700 ring-amber-200',
  'CERRADA': 'bg-green-50 text-green-700 ring-green-200',
  'EN_OPERACION': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'CARGA_ENTREGADA': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'CAIDO': 'bg-red-50 text-red-700 ring-red-200',
  'INACTIVO': 'bg-gray-50 text-gray-500 ring-gray-200',
};

const ESTADO_LABELS: Record<string, string> = {
  'PROSPECTO': 'Prospecto',
  'EN_NEGOCIACION': 'En negociación',
  'CERRADA': 'Cerrada',
  'EN_OPERACION': 'En operación',
  'CARGA_ENTREGADA': 'Carga entregada',
  'CAIDO': 'Caído',
  'INACTIVO': 'Inactivo',
};

const getSemaforoStyle = (fechaStr: string | null) => {
  if (!fechaStr) return 'text-gray-400';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [year, month, day] = fechaStr.substring(0, 10).split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'text-red-700 bg-red-50 font-semibold';
  if (diff <= 3) return 'text-amber-700 bg-amber-50 font-semibold';
  return 'text-emerald-700 bg-emerald-50';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  if (dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
};

/* ─── Action Menu ──────────────────────────────────────── */
function ActionMenu({ onView, onEdit, onArchive }: {
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
          <button onClick={() => { onView(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            <Eye size={14} /> Ver historial
          </button>
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            <Edit2 size={14} /> Editar
          </button>
          <button onClick={() => { onArchive(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
            <Archive size={14} /> Archivar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Mini Stat ────────────────────────────────────────── */
function MiniStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
      <div className="opacity-80">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider opacity-80 leading-tight">{label}</p>
        <p className="text-lg font-bold leading-tight tabular-nums">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* ─── Sort ─────────────────────────────────────────────── */
type SortState = null | 'proxima_fecha_asc' | 'proxima_fecha_desc';
const SORT_CYCLE: SortState[] = [null, 'proxima_fecha_asc', 'proxima_fecha_desc'];

/* ═══════════════════════════════════════════════════════════ */
export default function CarteraPage() {
  const { user, isJefeComercial, isAdmin } = useCurrentUser();
  const isBoss = isJefeComercial() || isAdmin();

  const [busqueda, setBusqueda] = useState('');
  const [tipoEstado, setTipoEstado] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null);
  const [comercialId, setComercialId] = useState<number | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  const [isGestionModalOpen, setIsGestionModalOpen] = useState(false);
  const [gestionClienteId, setGestionClienteId] = useState<number | null>(null);
  const [gestionClienteNombre, setGestionClienteNombre] = useState('');
  const [gestionClienteRuc, setGestionClienteRuc] = useState('');
  const [gestionClienteRazonSocial, setGestionClienteRazonSocial] = useState('');
  const [gestionEstadoActual, setGestionEstadoActual] = useState('');

  // Timeline modal
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineClienteId, setTimelineClienteId] = useState<number | null>(null);

  const { data: comerciales = [], isLoading: loadingComerciales } = useComerciales();

  const {
    clientes, totalPages, totalRegistros, isLoading, isError, isFetching, deleteMutation, exportMutation
  } = useClientes(busqueda, tipoEstado, comercialId, filtroFecha, page, pageSize, ordenarPor);

  const { data: stats } = useClientesStats(isBoss ? null : undefined);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setBusqueda(e.target.value); setPage(1); };
  const handleOpenCreate = () => { setClienteToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (c: Cliente) => { setClienteToEdit(c); setIsModalOpen(true); };
  const handleOpenDelete = (c: Cliente) => { setClienteToDelete(c); setIsConfirmOpen(true); };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    try { await deleteMutation.mutateAsync(clienteToDelete.id); toast.success('Cliente desactivado'); setIsConfirmOpen(false); setClienteToDelete(null); }
    catch { toast.error('Error al desactivar cliente'); }
  };

  const handleOpenGestion = (c: Cliente) => {
    setGestionClienteId(c.id); setGestionClienteNombre(c.razon_social);
    setGestionClienteRuc(c.ruc || ''); setGestionClienteRazonSocial(c.razon_social || '');
    setGestionEstadoActual(c.estado_nombre || ''); setIsGestionModalOpen(true);
  };

  const handleClearFilters = () => { setBusqueda(''); setTipoEstado(null); setComercialId(null); setFiltroFecha(null); setOrdenarPor(null); setPage(1); };

  const handleToggleSort = () => {
    const i = SORT_CYCLE.indexOf(ordenarPor);
    setOrdenarPor(SORT_CYCLE[(i + 1) % SORT_CYCLE.length]);
    setPage(1);
  };

  const sortIcon = ordenarPor === 'proxima_fecha_asc'
    ? <ArrowUp size={13} /> : ordenarPor === 'proxima_fecha_desc'
    ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />;

  const sortLabel = ordenarPor === 'proxima_fecha_asc'
    ? 'Próximos primero' : ordenarPor === 'proxima_fecha_desc'
    ? 'Lejanos primero' : 'Próx. contacto';

  const hasFilters = busqueda || tipoEstado || comercialId || filtroFecha || ordenarPor;

  const handleExport = async () => {
    try {
      const dataToExport = await exportMutation.mutateAsync();
      if (!dataToExport || dataToExport.length === 0) {
        toast.info('No hay datos para exportar con los filtros actuales');
        return;
      }

      const rows = dataToExport.map((c: Cliente) => ({
        'RUC': c.ruc || '-',
        'Razón Social': c.razon_social,
        'Dirección Fiscal': c.direccion_fiscal || '-',
        'Comercial': c.comercial_nombre || 'Sin asignar',
        'Estado': ESTADO_LABELS[c.estado_nombre || ''] || c.estado_nombre || '-',
        'Origen': c.origen_nombre || '-',
        'Contacto Principal': c.nombre_contacto || '-',
        'Teléfono': c.telefono || '-',
        'Correo': c.correo || '-',
        'Próximo Contacto': c.proxima_fecha_contacto ? formatDate(c.proxima_fecha_contacto) : '-',
        'Fecha Creación': c.created_at ? formatDate(c.created_at) : '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Cartera");
      XLSX.writeFile(wb, `cartera_clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Reporte exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar los datos');
      console.error('Error exportando cartera:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isBoss ? 'Cartera de Clientes' : 'Mi Cartera'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isBoss ? 'Vista global · Todos los comerciales' : 'Gestiona tus prospectos y clientes'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isBoss && (
              <button
                onClick={handleExport}
                disabled={exportMutation.isPending || isLoading}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {exportMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Exportar
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} /> Nuevo Cliente
            </button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <MiniStat icon={<Truck size={16} />} label="En operación" value={stats.en_operacion ?? 0} color="from-indigo-500 to-indigo-600" />
            <MiniStat icon={<PackageCheck size={16} />} label="Carga entregada" value={stats.carga_entregada ?? 0} color="from-emerald-500 to-emerald-600" />
            <MiniStat icon={<UserCheck size={16} />} label="Cerradas" value={stats.cerradas ?? 0} color="from-green-500 to-green-600" />
            <MiniStat icon={<UserPlus size={16} />} label="Nuevos" value={stats.nuevos_clientes ?? 0} color="from-teal-500 to-teal-600" />
            <MiniStat icon={<Building2 size={16} />} label="Total" value={stats.total ?? 0} color="from-blue-500 to-blue-600" />
            <MiniStat icon={<Users size={16} />} label="Prospectos" value={stats.prospectos ?? 0} color="from-amber-500 to-amber-600" />
            <MiniStat icon={<UserMinus size={16} />} label="Caídos" value={stats.caidos ?? 0} color="from-red-500 to-red-600" />
          </div>
        )}

        {/* ── Filters (single row) ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar RUC o razón social..."
                value={busqueda}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 text-sm transition-all"
              />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={14} />}
            </div>

            {/* Estado */}
            <select
              value={tipoEstado || ''}
              onChange={(e) => { setTipoEstado(e.target.value || null); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="PROSPECTO">Prospectos</option>
              <option value="EN_NEGOCIACION">En Negociación</option>
              <option value="CERRADA">Cerradas</option>
              <option value="EN_OPERACION">En Operación</option>
              <option value="CARGA_ENTREGADA">Carga Entregada</option>
              <option value="CAIDO">Caídos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={handleToggleSort}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                ordenarPor
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="Ordenar por próxima fecha de contacto"
            >
              {sortIcon}
              {sortLabel}
            </button>

            {/* Comercial filter (boss only) */}
            {isBoss && (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select
                  value={comercialId || ''}
                  onChange={(e) => { setComercialId(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}
                  disabled={loadingComerciales}
                  className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer bg-white min-w-[180px] disabled:opacity-50"
                >
                  <option value="">Todos los comerciales</option>
                  {comerciales.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear */}
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors cursor-pointer"
                title="Limpiar filtros"
              >
                <X size={14} />
              </button>
            )}

            {/* Count badge */}
            <div className="ml-auto text-xs text-gray-400 font-medium tabular-nums">
              {totalRegistros.toLocaleString()} registros
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────── */}
          <div className="overflow-auto max-h-[calc(100vh-340px)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 size={36} className="animate-spin mb-3" />
                <p className="text-sm">Cargando clientes...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-400">
                <AlertCircle size={36} className="mb-3" />
                <p className="text-sm">Error al cargar clientes</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Building2 size={36} className="mb-3 opacity-60" />
                <p className="text-sm font-medium">No hay clientes</p>
                <p className="text-xs mt-1">{hasFilters ? 'Ajusta los filtros' : 'Crea tu primer cliente'}</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-20">
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="pl-5 pr-3 py-3 font-semibold w-[120px]">RUC</th>
                    <th className="px-3 py-3 font-semibold">Razón Social</th>
                    {isBoss && <th className="px-3 py-3 font-semibold">Comercial</th>}
                    <th className="px-3 py-3 font-semibold">Contacto</th>
                    <th className="px-3 py-3 font-semibold">Teléfono</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 font-semibold">Últ. Contacto</th>
                    <th className="px-3 py-3 font-semibold">
                      <button
                        onClick={handleToggleSort}
                        className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors"
                      >
                        Próx. Contacto {sortIcon}
                      </button>
                    </th>
                    <th className="px-3 py-3 font-semibold text-center w-[80px]">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente, idx) => (
                    <tr
                      key={cliente.id}
                      className={`group transition-colors hover:bg-indigo-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="pl-5 pr-3 py-3">
                        <span className="text-xs font-mono text-gray-500">{cliente.ruc || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-semibold text-gray-800 line-clamp-1">{cliente.razon_social}</span>
                      </td>
                      {isBoss && (
                        <td className="px-3 py-3">
                          <span className="text-xs text-gray-600">
                            {cliente.comercial_nombre || <span className="text-gray-400 italic">Sin asignar</span>}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-600">{cliente.nombre_contacto || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-600 font-mono">{cliente.telefono || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${ESTADO_COLORS[cliente.estado_nombre || ''] || 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                          {ESTADO_LABELS[cliente.estado_nombre || ''] || 'Desconocido'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-500">{formatDate(cliente.updated_at || cliente.created_at)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] ${getSemaforoStyle(cliente.proxima_fecha_contacto)}`}>
                          {formatDate(cliente.proxima_fecha_contacto)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenGestion(cliente)}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Registrar Gestión"
                          >
                            <ClipboardList size={15} />
                          </button>
                          <ActionMenu
                            onView={() => { setTimelineClienteId(cliente.id); setIsTimelineOpen(true); }}
                            onEdit={() => handleOpenEdit(cliente)}
                            onArchive={() => handleOpenDelete(cliente)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          {!isLoading && clientes.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {clientes.length} de {totalRegistros.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-500 px-2 tabular-nums">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────── */}
      <ModalCliente
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setClienteToEdit(null); }}
        clienteToEdit={clienteToEdit}
        showAdminFields={isBoss}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setClienteToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="¿Desactivar cliente?"
        message={`Estás a punto de desactivar "${clienteToDelete?.razon_social}". Esta acción se puede revertir.`}
        confirmText="Desactivar"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />

      {gestionClienteId && (
        <ModalRegistrarGestion
          clienteId={gestionClienteId}
          clienteNombre={gestionClienteNombre}
          clienteRuc={gestionClienteRuc}
          clienteRazonSocial={gestionClienteRazonSocial}
          estadoActual={gestionEstadoActual}
          isOpen={isGestionModalOpen}
          onClose={() => { setIsGestionModalOpen(false); setGestionClienteId(null); }}
        />
      )}

      <ModalTimeline
        clienteId={timelineClienteId}
        isOpen={isTimelineOpen}
        onClose={() => { setIsTimelineOpen(false); setTimelineClienteId(null); }}
      />
    </div>
  );
}