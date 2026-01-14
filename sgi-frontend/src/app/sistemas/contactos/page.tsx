/**
 * Contactos Page (Sistemas)
 * - Upload Excel de Contactos
 * - Vista de contactos con paginación
 * - Estadísticas de disponibles
 * - CRUD de Casos de Llamada
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExcelUploader } from '@/components/common/ExcelUploader';
import { contactosService } from '@/services/contactos';
import { casosLlamadaService } from '@/services/casos-llamada';
import { Contacto, ContactoStats } from '@/types/contactos';
import { CasoLlamada } from '@/types/casos-llamada';
import {
    FileSpreadsheet, CheckCircle2, Users, Phone, Clock,
    ChevronLeft, ChevronRight, Search, Plus, Pencil, Trash2, X
} from 'lucide-react';

export default function ContactosPage() {
    // Estado upload
    const [lastUploadStatus, setLastUploadStatus] = useState<string>('');

    // Estado contactos
    const [contactos, setContactos] = useState<Contacto[]>([]);
    const [stats, setStats] = useState<ContactoStats | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    // Estado casos llamada
    const [casos, setCasos] = useState<CasoLlamada[]>([]);
    const [showCasosModal, setShowCasosModal] = useState(false);
    const [editingCaso, setEditingCaso] = useState<CasoLlamada | null>(null);
    const [casoForm, setCasoForm] = useState({ nombre: '', contestado: false });

    // Cargar contactos paginados
    const loadContactos = useCallback(async () => {
        setLoading(true);
        try {
            const response = await contactosService.getPaginated(page, pageSize, search || undefined, estadoFilter || undefined);
            setContactos(response.data || []);
            if (response.stats) {
                setStats({
                    total_registros: response.stats.total_registros ?? 0,
                    disponibles: response.stats.disponibles ?? 0,
                    asignados: response.stats.asignados ?? 0,
                    en_gestion: response.stats.en_gestion ?? 0,
                    total_filtrado: response.stats.total_filtrado ?? 0,
                });
                setTotalPages(Math.ceil((response.stats.total_filtrado ?? 0) / pageSize) || 1);
            }
        } catch (error) {
            console.error('Error loading contactos:', error);
            // Establecer stats por defecto en caso de error
            setStats({ total_registros: 0, disponibles: 0, asignados: 0, en_gestion: 0, total_filtrado: 0 });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, estadoFilter]);

    // Cargar casos de llamada
    const loadCasos = async () => {
        try {
            const data = await casosLlamadaService.getAll();
            setCasos(data);
        } catch (error) {
            console.error('Error loading casos:', error);
        }
    };

    useEffect(() => {
        loadContactos();
    }, [loadContactos]);

    useEffect(() => {
        loadCasos();
    }, []);

    // Handlers
    const handleUpload = async (file: File) => {
        try {
            const res = await contactosService.upload(file);
            setLastUploadStatus(res.message || 'Carga exitosa');
            loadContactos();
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadContactos();
    };

    // CRUD Casos
    const handleSaveCaso = async () => {
        try {
            if (editingCaso) {
                await casosLlamadaService.update(editingCaso.id, casoForm);
            } else {
                await casosLlamadaService.create(casoForm);
            }
            loadCasos();
            setShowCasosModal(false);
            setCasoForm({ nombre: '', contestado: false });
            setEditingCaso(null);
        } catch (error) {
            console.error('Error saving caso:', error);
        }
    };

    const handleDeleteCaso = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar este caso?')) return;
        try {
            await casosLlamadaService.delete(id);
            loadCasos();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const openEditCaso = (caso: CasoLlamada) => {
        setEditingCaso(caso);
        setCasoForm({ nombre: caso.nombre, contestado: caso.contestado });
        setShowCasosModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Contactos</h1>
                <p className="text-gray-500">Sube contactos y gestiona los casos de llamada.</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Total</span>
                        </div>
                        <span className="text-2xl font-bold">{stats.total_registros.toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Disponibles</span>
                        </div>
                        <span className="text-2xl font-bold">{stats.disponibles.toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">Asignados</span>
                        </div>
                        <span className="text-2xl font-bold">{stats.asignados.toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 opacity-80" />
                            <span className="text-sm opacity-80">En Gestión</span>
                        </div>
                        <span className="text-2xl font-bold">{stats.en_gestion.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-medium mb-2">Subir Archivo de Contactos</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Los contactos nuevos serán agregados. Los duplicados (mismo teléfono) serán ignorados.
                        </p>
                        <div className="w-full max-w-xl">
                            <ExcelUploader onUpload={handleUpload} label="Seleccionar Excel de Contactos" />
                        </div>
                    </div>
                </div>

                {lastUploadStatus && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        {lastUploadStatus}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Formato Requerido</h3>
                    <div className="mt-3 overflow-x-auto">
                        <table className="text-sm border rounded">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Columna</th>
                                    <th className="px-4 py-2 text-left font-medium">Requerido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr><td className="px-4 py-2 font-mono">ruc</td><td className="px-4 py-2 text-green-600">✓ Sí</td></tr>
                                <tr><td className="px-4 py-2 font-mono">telefono</td><td className="px-4 py-2 text-green-600">✓ Sí</td></tr>
                                <tr><td className="px-4 py-2 font-mono">correo</td><td className="px-4 py-2 text-gray-400">Opcional</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Casos de Llamada Section */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Casos de Llamada</h2>
                    <button
                        onClick={() => { setEditingCaso(null); setCasoForm({ nombre: '', contestado: false }); setShowCasosModal(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" /> Nuevo
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {casos.map(caso => (
                        <div key={caso.id} className={`p-3 rounded-lg border ${caso.contestado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${caso.contestado ? 'text-green-700' : 'text-gray-700'}`}>
                                    {caso.nombre}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditCaso(caso)} className="p-1 hover:bg-white rounded">
                                        <Pencil className="w-3 h-3 text-gray-500" />
                                    </button>
                                    <button onClick={() => handleDeleteCaso(caso.id)} className="p-1 hover:bg-white rounded">
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">{caso.contestado ? 'Contestado' : 'No contestado'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contactos Table */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h2 className="text-lg font-medium">Base de Contactos</h2>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por RUC, teléfono..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-md text-sm w-64"
                            />
                        </div>
                        <select
                            value={estadoFilter}
                            onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
                            className="border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Todos los estados</option>
                            <option value="DISPONIBLE">Disponible</option>
                            <option value="ASIGNADO">Asignado</option>
                            <option value="EN_GESTION">En Gestión</option>
                        </select>
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">RUC</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Razón Social</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Teléfono</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Contestó</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Caso</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : contactos.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay contactos</td></tr>
                            ) : contactos.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs">{c.ruc}</td>
                                    <td className="px-4 py-3">{c.razon_social || '-'}</td>
                                    <td className="px-4 py-3">{c.telefono}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${c.contestado === 'Sí' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {c.contestado || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs">{c.caso || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium
                                            ${c.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-700' : ''}
                                            ${c.estado === 'ASIGNADO' ? 'bg-amber-100 text-amber-700' : ''}
                                            ${c.estado === 'EN_GESTION' ? 'bg-purple-100 text-purple-700' : ''}
                                        `}>
                                            {c.estado || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-500">
                        Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, stats?.total_filtrado || 0)} de {stats?.total_filtrado || 0}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-2 text-sm">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Casos */}
            {showCasosModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">{editingCaso ? 'Editar Caso' : 'Nuevo Caso'}</h3>
                            <button onClick={() => setShowCasosModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={casoForm.nombre}
                                    onChange={(e) => setCasoForm(f => ({ ...f, nombre: e.target.value }))}
                                    className="w-full border rounded-md px-3 py-2"
                                    placeholder="Ej: Contestó - Interesado"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="contestado"
                                    checked={casoForm.contestado}
                                    onChange={(e) => setCasoForm(f => ({ ...f, contestado: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="contestado" className="text-sm text-gray-700">¿Contestó la llamada?</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCasosModal(false)}
                                className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCaso}
                                disabled={!casoForm.nombre.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}