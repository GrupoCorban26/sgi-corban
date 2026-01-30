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
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useClientes, useClientesStats } from '@/hooks/comercial/useClientes';
import { Cliente } from '@/types/cliente';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalCliente from './components/modal-cliente';
import ModalContactosCliente from './components/modal-contactos-cliente';

const ESTADO_COLORS = {
  'PROSPECTO': 'bg-yellow-100 text-yellow-700',
  'CLIENTE': 'bg-green-100 text-green-700',
  'INACTIVO': 'bg-gray-100 text-gray-500',
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

  // Modal de contactos
  const [isContactosModalOpen, setIsContactosModalOpen] = useState(false);
  const [contactosRuc, setContactosRuc] = useState('');
  const [contactosRazonSocial, setContactosRazonSocial] = useState('');

  // Data
  const {
    clientes,
    totalPages,
    totalRegistros,
    isLoading,
    isError,
    isFetching,
    deleteMutation
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
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg shadow-green-200">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Clientes</span>
            </div>
            <span className="text-2xl font-bold">{(stats.clientes_activos ?? 0).toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-4 rounded-xl text-white shadow-lg shadow-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Inactivos</span>
            </div>
            <span className="text-2xl font-bold">{(stats.inactivos ?? 0).toLocaleString()}</span>
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
              <option value="CLIENTE">Clientes</option>
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
                      <span className="text-sm text-gray-600">
                        {formatDate(cliente.proxima_fecha_contacto)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(cliente)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(cliente)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
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
    </div>
  );
}