'use client';

import React, { useState } from 'react';
import {
    Search,
    Building2,
    Users,
    UserCheck,
    UserX,
    Edit2,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Filter,
    User
} from 'lucide-react';
import { useClientes, useClientesStats } from '@/hooks/comercial/useClientes';
import { Cliente } from '@/types/cliente';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import ModalCliente from '../cartera/components/modal-cliente';

const ESTADO_COLORS: Record<string, string> = {
    'PROSPECTO': 'bg-yellow-100 text-yellow-700',
    'CLIENTE': 'bg-green-100 text-green-700',
    'INACTIVO': 'bg-gray-100 text-gray-500',
};

// Helper para formatear fechas evitando problemas de zona horaria
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    // Si es solo fecha YYYY-MM-DD
    if (dateStr.length === 10) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    // Si es datetime
    return new Date(dateStr).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export default function CarteraGlobalPage() {
    const [busqueda, setBusqueda] = useState('');
    const [tipoEstado, setTipoEstado] = useState<string | null>(null);
    const [comercialId, setComercialId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);

    // Dropdown de comerciales
    const { data: comerciales = [], isLoading: loadingComerciales } = useComerciales();

    // Data - SIN FILTRO de comercial propio (ve todos)
    const {
        clientes,
        totalPages,
        totalRegistros,
        isLoading,
        isError,
        isFetching,
        refetch
    } = useClientes(busqueda, tipoEstado, comercialId, page, pageSize);

    // Stats globales (sin filtro de comercial para ver totales de todos)
    const { data: stats } = useClientesStats(null);

    // Handlers
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBusqueda(e.target.value);
        setPage(1);
    };

    const handleComercialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setComercialId(value ? parseInt(value) : null);
        setPage(1);
    };

    const handleEditCliente = (cliente: Cliente) => {
        setClienteToEdit(cliente);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setClienteToEdit(null);
    };

    const handleClienteSaved = () => {
        refetch();
        // Opcional: Actualizar stats si es necesario
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cartera Global</h1>
                    <p className="text-sm text-gray-500">Vista de todos los clientes de todos los comerciales</p>
                </div>
            </div>

            {/* Stats Cards - Globales */}
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
                <div className="p-4 border-b flex flex-col lg:flex-row gap-4 items-center justify-between">
                    {/* Búsqueda */}
                    <div className="relative w-full lg:w-80">
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

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        {/* Filtro por Estado */}
                        <select
                            value={tipoEstado || ''}
                            onChange={(e) => { setTipoEstado(e.target.value || null); setPage(1); }}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer min-w-[150px]"
                        >
                            <option value="">Todos los estados</option>
                            <option value="PROSPECTO">Prospectos</option>
                            <option value="CLIENTE">Clientes</option>
                            <option value="INACTIVO">Inactivos</option>
                        </select>

                        {/* Filtro por Comercial */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                value={comercialId || ''}
                                onChange={handleComercialChange}
                                disabled={loadingComerciales}
                                className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer min-w-[200px] disabled:opacity-50"
                            >
                                <option value="">Todos los comerciales</option>
                                {comerciales.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Limpiar filtros */}
                        {(busqueda || tipoEstado || comercialId) && (
                            <button
                                onClick={() => { setBusqueda(''); setTipoEstado(null); setComercialId(null); setPage(1); }}
                                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                                <Filter size={16} />
                                Limpiar
                            </button>
                        )}
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
                            <p className="text-xs">Ajusta los filtros para ver resultados</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Razón Social</th>
                                    <th className="px-6 py-4 font-semibold">Comercial</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4 font-semibold">Últ. Contacto</th>
                                    <th className="px-6 py-4 font-semibold">Próx. Contacto</th>
                                    <th className="px-6 py-4 font-semibold">Comentario</th>
                                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {clientes.map((cliente: Cliente) => (
                                    <tr key={cliente.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-800">{cliente.razon_social}</div>
                                            {cliente.nombre_comercial && (
                                                <div className="text-xs text-gray-500">{cliente.nombre_comercial}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {cliente.comercial_nombre || <span className="text-gray-400 italic">Sin asignar</span>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[cliente.tipo_estado] || 'bg-gray-100'}`}>
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
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <p className="text-sm text-gray-600 truncate" title={cliente.comentario_ultima_llamada || ''}>
                                                {cliente.comentario_ultima_llamada || '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditCliente(cliente)}
                                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                                    title="Editar cliente"
                                                >
                                                    <Edit2 size={16} />
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

            {/* Modal Editar (con campos de Admin activados) */}
            <ModalCliente
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                clienteToEdit={clienteToEdit}
                onClienteCreado={handleClienteSaved}
                showAdminFields={true}
            />
        </div>
    );
}
