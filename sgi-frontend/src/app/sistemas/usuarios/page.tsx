'use client';

import React, { useState } from 'react';
import { Users, Plus, Search, RefreshCw, Edit2, Power, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { useUsuarios } from '@/hooks/useUsuarios';
import { Usuario } from '@/types/usuario';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalUsuario from './components/modal-usuario';

export default function UsuariosPage() {
    // State
    const [busqueda, setBusqueda] = useState('');
    const [filterActive, setFilterActive] = useState<boolean | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [usuarioToToggle, setUsuarioToToggle] = useState<Usuario | null>(null);

    // Hooks
    const {
        usuarios,
        totalPages,
        totalRegistros,
        isLoading,
        isFetching,
        refetch,
        deleteMutation,
        reactivateMutation,
    } = useUsuarios(busqueda, filterActive, null, page, pageSize);

    // Handlers
    const handleOpenCreate = () => {
        setUsuarioToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (usuario: Usuario) => {
        setUsuarioToEdit(usuario);
        setIsModalOpen(true);
    };

    const handleToggleStatus = (usuario: Usuario) => {
        setUsuarioToToggle(usuario);
        setIsConfirmOpen(true);
    };

    const handleConfirmToggle = async () => {
        if (!usuarioToToggle) return;
        try {
            if (usuarioToToggle.is_active) {
                await deleteMutation.mutateAsync(usuarioToToggle.id);
                toast.success('Usuario desactivado');
            } else {
                await reactivateMutation.mutateAsync(usuarioToToggle.id);
                toast.success('Usuario reactivado');
            }
            setIsConfirmOpen(false);
            setUsuarioToToggle(null);
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al cambiar estado');
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-indigo-600" size={28} />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm text-gray-500">Administra los usuarios del sistema</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-colors"
                >
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o correo..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Filter by status */}
                    <select
                        value={filterActive === null ? '' : filterActive.toString()}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFilterActive(val === '' ? null : val === 'true');
                            setPage(1);
                        }}
                        className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Todos los estados</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={18} className={`text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Empleado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Correo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Último Acceso</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="animate-spin" size={24} />
                                            <span>Cargando usuarios...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                usuarios.map((usuario) => (
                                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {usuario.empleado_nombre || 'Sin empleado'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700">{usuario.correo_corp}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {usuario.roles ? (
                                                    usuario.roles.split(', ').map((rol, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                                            {rol}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">Sin roles</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {usuario.is_bloqueado ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                    Bloqueado
                                                </span>
                                            ) : usuario.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {usuario.ultimo_acceso
                                                    ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-PE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : 'Nunca'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleOpenEdit(usuario)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(usuario)}
                                                    className={`p-2 rounded-lg transition-colors ${usuario.is_active
                                                        ? 'text-amber-600 hover:bg-amber-50'
                                                        : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={usuario.is_active ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {usuario.is_active ? <Power size={16} /> : <Unlock size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-500">
                            Mostrando página {page} de {totalPages} ({totalRegistros} usuarios)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ModalUsuario
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                usuarioToEdit={usuarioToEdit}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => { setIsConfirmOpen(false); setUsuarioToToggle(null); }}
                onConfirm={handleConfirmToggle}
                title={usuarioToToggle?.is_active ? '¿Desactivar usuario?' : '¿Reactivar usuario?'}
                message={`Estás a punto de ${usuarioToToggle?.is_active ? 'desactivar' : 'reactivar'} el usuario "${usuarioToToggle?.empleado_nombre || usuarioToToggle?.correo_corp}".`}
                confirmText={usuarioToToggle?.is_active ? 'Desactivar' : 'Reactivar'}
                isLoading={deleteMutation.isPending || reactivateMutation.isPending}
                variant={usuarioToToggle?.is_active ? 'danger' : 'warning'}
            />
        </div>
    );
}