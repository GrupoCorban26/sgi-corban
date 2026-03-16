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
  Filter,
  Phone,
  Truck,
  UserPlus,
  ClipboardList,
  MoreHorizontal,
  Archive,
  PackageCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useClientes, useClientesStats } from '@/hooks/comercial/useClientes';
import { Cliente } from '@/types/cliente';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalCliente from './components/modal-cliente';
import ModalRegistrarGestion from './components/ModalRegistrarGestion';

const ESTADO_COLORS: Record<string, string> = {
  'PROSPECTO': 'bg-sky-100 text-sky-700',
  'EN_NEGOCIACION': 'bg-amber-100 text-amber-700',
  'CERRADA': 'bg-green-100 text-green-700',
  'EN_OPERACION': 'bg-indigo-100 text-indigo-700',
  'CARGA_ENTREGADA': 'bg-emerald-100 text-emerald-700',
  'CAIDO': 'bg-red-100 text-red-700',
  'INACTIVO': 'bg-gray-100 text-gray-500',
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

// Helper para semáforo de próxima fecha de contacto
const getSemaforoColor = (fechaStr: string | null) => {
  if (!fechaStr) return '';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [year, month, day] = fechaStr.substring(0, 10).split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'bg-red-100 text-red-700 font-semibold'; // Vencido
  if (diff <= 3) return 'bg-yellow-100 text-yellow-700 font-semibold'; // Próximo
  return 'bg-green-50 text-green-700'; // Al día
};

// Helper para formatear fechas evitando problemas de zona horaria
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  if (dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Componente de menú contextual
function ActionMenu({ cliente, onEdit, onArchive }: {
  cliente: Cliente;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors cursor-pointer"
        title="Más opciones"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Edit2 size={14} /> Editar
          </button>
          <button
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Archive size={14} /> Archivar
          </button>
        </div>
      )}
    </div>
  );
}

export default function CarteraPage() {
  const [busqueda, setBusqueda] = useState('');
  const [tipoEstado, setTipoEstado] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  // Modal de gestión
  const [isGestionModalOpen, setIsGestionModalOpen] = useState(false);
  const [gestionClienteId, setGestionClienteId] = useState<number | null>(null);
  const [gestionClienteNombre, setGestionClienteNombre] = useState('');
  const [gestionClienteRuc, setGestionClienteRuc] = useState('');
  const [gestionClienteRazonSocial, setGestionClienteRazonSocial] = useState('');
  const [gestionEstadoActual, setGestionEstadoActual] = useState('');

  // Data
  const {
    clientes,
    totalPages,
    totalRegistros,
    isLoading,
    isError,
    isFetching,
    deleteMutation,
  } = useClientes(busqueda, tipoEstado, null, page, pageSize);

  const { data: stats } = useClientesStats();

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const handleOpenCreate = () => {
    setClienteToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setClienteToEdit(cliente);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    try {
      await deleteMutation.mutateAsync(clienteToDelete.id);
      toast.success('Cliente desactivado correctamente');
      setIsConfirmOpen(false);
      setClienteToDelete(null);
    } catch {
      toast.error('Error al desactivar cliente');
    }
  };

  const handleOpenGestion = (cliente: Cliente) => {
    setGestionClienteId(cliente.id);
    setGestionClienteNombre(cliente.razon_social);
    setGestionClienteRuc(cliente.ruc || '');
    setGestionClienteRazonSocial(cliente.razon_social || '');
    setGestionEstadoActual(cliente.tipo_estado);
    setIsGestionModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mi Cartera de Clientes</h1>
          <p className="text-sm text-gray-500">Gestiona tus prospectos y clientes</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3.5 rounded-xl text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">En operación</span>
            </div>
            <span className="text-xl font-bold">{(stats.en_operacion ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3.5 rounded-xl text-white shadow-lg shadow-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <PackageCheck className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Carga entregada</span>
            </div>
            <span className="text-xl font-bold">{(stats.carga_entregada ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3.5 rounded-xl text-white shadow-lg shadow-green-200">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Cerradas</span>
            </div>
            <span className="text-xl font-bold">{(stats.cerradas ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-3.5 rounded-xl text-white shadow-lg shadow-teal-200">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Nuevos clientes</span>
            </div>
            <span className="text-xl font-bold">{(stats.nuevos_clientes ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3.5 rounded-xl text-white shadow-lg shadow-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Total cartera</span>
            </div>
            <span className="text-xl font-bold">{(stats.total ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3.5 rounded-xl text-white shadow-lg shadow-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Prospectos</span>
            </div>
            <span className="text-xl font-bold">{(stats.prospectos ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-3.5 rounded-xl text-white shadow-lg shadow-red-200">
            <div className="flex items-center gap-2 mb-1">
              <UserMinus className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">Caídos</span>
            </div>
            <span className="text-xl font-bold">{(stats.caidos ?? 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por RUC o razón social..."
              value={busqueda}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={tipoEstado || ''}
              onChange={(e) => { setTipoEstado(e.target.value || null); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
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
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-gray-600">
              <Filter size={16} /> Más Filtros
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 size={40} className="animate-spin mb-3" />
              <p className="text-sm">Cargando clientes...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-400">
              <AlertCircle size={40} className="mb-3" />
              <p className="text-sm">Error al cargar clientes</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Building2 size={40} className="mb-3" />
              <p className="text-sm font-medium">No hay clientes</p>
              <p className="text-xs">Agrega tu primer cliente haciendo clic en &quot;Nuevo Cliente&quot;</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">RUC</th>
                  <th className="px-6 py-4 font-semibold">Razón Social</th>
                  <th className="px-6 py-4 font-semibold">Teléfono</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">Últ. Contacto</th>
                  <th className="px-6 py-4 font-semibold">Próx. Contacto</th>
                  <th className="px-6 py-4 font-semibold min-w-[200px]">Comentario</th>
                  <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-700">{cliente.ruc || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{cliente.razon_social}</div>
                      {cliente.nombre_comercial && (
                        <div className="text-xs text-gray-500">{cliente.nombre_comercial}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} className="text-indigo-400" />
                        <span className="text-sm">{cliente.telefono || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[cliente.tipo_estado] || 'bg-gray-100 text-gray-500'}`}>
                        {ESTADO_LABELS[cliente.tipo_estado] || cliente.tipo_estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(cliente.ultimo_contacto)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${getSemaforoColor(cliente.proxima_fecha_contacto)}`}>
                        {formatDate(cliente.proxima_fecha_contacto)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-xs text-gray-500 block max-w-[250px] truncate"
                        title={cliente.comentario_ultima_llamada || ''}
                      >
                        {cliente.comentario_ultima_llamada || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Acción principal: Registrar Gestión */}
                        <button
                          onClick={() => handleOpenGestion(cliente)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Registrar Gestión"
                        >
                          <ClipboardList size={16} />
                        </button>

                        {/* Menú contextual: Editar + Archivar */}
                        <ActionMenu
                          cliente={cliente}
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

        {/* Pagination */}
        {!isLoading && clientes.length > 0 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {clientes.length} de {totalRegistros} clientes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 px-3">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalCliente
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setClienteToEdit(null); }}
        clienteToEdit={clienteToEdit}
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
    </div>
  );
}