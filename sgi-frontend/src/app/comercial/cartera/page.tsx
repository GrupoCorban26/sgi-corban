'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  Users,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  History,
  Archive,
  UserMinus,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { useClientes, useClientesStats } from '@/hooks/comercial/useClientes';
import { Cliente, ClienteMarcarPerdido } from '@/types/cliente';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalCliente from './components/modal-cliente';
import ModalContactosCliente from './components/modal-contactos-cliente';
import ModalMarcarPerdido from './components/modal-marcar-perdido';
import ModalRegistrarGestion from './components/ModalRegistrarGestion';

const ESTADO_COLORS = {
  'PROSPECTO': 'bg-yellow-100 text-yellow-700',
  'EN_NEGOCIACION': 'bg-blue-100 text-blue-700',
  'CLIENTE': 'bg-green-100 text-green-700',
  'PERDIDO': 'bg-red-100 text-red-700',
  'INACTIVO': 'bg-gray-100 text-gray-500',
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

  // Modal Perdido
  const [isPerdidoModalOpen, setIsPerdidoModalOpen] = useState(false);
  const [clienteToMarkLost, setClienteToMarkLost] = useState<Cliente | null>(null);

  // Modal de contactos
  const [isContactosModalOpen, setIsContactosModalOpen] = useState(false);
  const [contactosRuc, setContactosRuc] = useState('');
  const [contactosRazonSocial, setContactosRazonSocial] = useState('');

  // Modal de gestión
  const [isGestionModalOpen, setIsGestionModalOpen] = useState(false);
  const [gestionClienteId, setGestionClienteId] = useState<number | null>(null);
  const [gestionClienteNombre, setGestionClienteNombre] = useState('');

  // Data
  const {
    clientes,
    totalPages,
    totalRegistros,
    isLoading,
    isError,
    isFetching,
    deleteMutation,
    cambiarEstadoMutation,
    marcarPerdidoMutation,
    reactivarMutation,
    archivarMutation
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

  const handleClienteCreado = (ruc: string, razonSocial: string) => {
    setContactosRuc(ruc);
    setContactosRazonSocial(razonSocial);
    setIsContactosModalOpen(true);
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

  const handleCambiarEstado = async (cliente: Cliente, nuevoEstado: string) => {
    try {
      await cambiarEstadoMutation.mutateAsync({ id: cliente.id, nuevoEstado });
      toast.success(`Estado actualizado a ${nuevoEstado}`);
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleReactivar = async (cliente: Cliente) => {
    try {
      await reactivarMutation.mutateAsync(cliente.id);
      toast.success('Cliente reactivado a Prospecto');
    } catch {
      toast.error('Error al reactivar cliente');
    }
  };

  const handleOpenMarcarPerdido = (cliente: Cliente) => {
    setClienteToMarkLost(cliente);
    setIsPerdidoModalOpen(true);
  };

  const handleConfirmMarcarPerdido = async (data: ClienteMarcarPerdido) => {
    if (!clienteToMarkLost) return;
    try {
      await marcarPerdidoMutation.mutateAsync({ id: clienteToMarkLost.id, data });
      toast.success('Cliente marcado como perdido');
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Error al marcar como perdido';
      toast.error(message);
    }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg shadow-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Total</span>
            </div>
            <span className="text-2xl font-bold">{(stats.total ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl text-white shadow-lg shadow-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Prospectos</span>
            </div>
            <span className="text-2xl font-bold">{(stats.prospectos ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">En Negociación</span>
            </div>
            <span className="text-2xl font-bold">{(stats.en_negociacion ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg shadow-green-200">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Clientes</span>
            </div>
            <span className="text-2xl font-bold">{(stats.clientes_activos ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-lg shadow-red-200">
            <div className="flex items-center gap-2 mb-1">
              <UserMinus className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Perdidos</span>
            </div>
            <span className="text-2xl font-bold">{(stats.perdidos ?? 0).toLocaleString()}</span>
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
              <option value="CLIENTE">Clientes</option>
              <option value="PERDIDO">Perdidos</option>
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
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">Últ. Contacto</th>
                  <th className="px-6 py-4 font-semibold">Próx. Contacto</th>
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[cliente.tipo_estado]}`}>
                        {cliente.tipo_estado}
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
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Acciones Pipeline */}
                        {cliente.tipo_estado === 'PROSPECTO' && (
                          <button
                            onClick={() => handleCambiarEstado(cliente, 'EN_NEGOCIACION')}
                            className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Avanzar a Negociación"
                          >
                            <ArrowRight size={16} />
                          </button>
                        )}

                        {cliente.tipo_estado === 'EN_NEGOCIACION' && (
                          <>
                            <button
                              onClick={() => handleCambiarEstado(cliente, 'CLIENTE')}
                              className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors cursor-pointer"
                              title="Cerrar Venta"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenMarcarPerdido(cliente)}
                              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Marcar Perdido"
                            >
                              <UserMinus size={16} />
                            </button>
                          </>
                        )}

                        {cliente.tipo_estado === 'PERDIDO' && (
                          <button
                            onClick={() => handleReactivar(cliente)}
                            className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition-colors cursor-pointer"
                            title="Reactivar Prospecto"
                          >
                            <History size={16} />
                          </button>
                        )}

                        {/* Edición Genérica */}
                        <button
                          onClick={() => {
                            setGestionClienteId(cliente.id);
                            setGestionClienteNombre(cliente.razon_social);
                            setIsGestionModalOpen(true);
                          }}
                          className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Registrar Gestión"
                        >
                          <Phone size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cliente)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Archivar / Eliminar */}
                        <button
                          onClick={() => handleOpenDelete(cliente)}
                          className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                          title="Archivar"
                        >
                          <Archive size={16} />
                        </button>
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
        onClienteCreado={handleClienteCreado}
      />

      <ModalContactosCliente
        isOpen={isContactosModalOpen}
        onClose={() => { setIsContactosModalOpen(false); setContactosRuc(''); setContactosRazonSocial(''); }}
        ruc={contactosRuc}
        razonSocial={contactosRazonSocial}
      />

      <ModalMarcarPerdido
        isOpen={isPerdidoModalOpen}
        onClose={() => { setIsPerdidoModalOpen(false); setClienteToMarkLost(null); }}
        onConfirm={handleConfirmMarcarPerdido}
        isLoading={marcarPerdidoMutation.isPending}
        clienteNombre={clienteToMarkLost?.razon_social || ''}
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
          isOpen={isGestionModalOpen}
          onClose={() => { setIsGestionModalOpen(false); setGestionClienteId(null); }}
        />
      )}
    </div>
  );
}