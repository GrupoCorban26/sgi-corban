'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { X, UserPlus, Loader2, Search } from 'lucide-react';

interface ModalCrearInstanciaProps {
    onConfirm: (usuarioId: number) => void;
    onClose: () => void;
    isLoading: boolean;
}

interface ComercialOption {
    id: number;
    nombre: string;
    correo: string;
}

export default function ModalCrearInstancia({
    onConfirm,
    onClose,
    isLoading,
}: ModalCrearInstanciaProps) {
    const [comerciales, setComerciales] = useState<ComercialOption[]>([]);
    const [loadingComerciales, setLoadingComerciales] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    // Cargar comerciales disponibles
    useEffect(() => {
        const fetchComerciales = async () => {
            try {
                // Usar endpoint existente de usuarios con rol COMERCIAL
                const { data } = await api.get('/seg/usuarios', {
                    params: { rol: 'COMERCIAL' },
                });
                // Mapear a formato simple
                const opts: ComercialOption[] = (data || []).map((u: Record<string, unknown>) => ({
                    id: u.id,
                    nombre: u.nombre_completo || u.correo_corp || `Usuario ${u.id}`,
                    correo: u.correo_corp || '',
                }));
                setComerciales(opts);
            } catch (err) {
                console.error('Error cargando comerciales:', err);
            } finally {
                setLoadingComerciales(false);
            }
        };
        fetchComerciales();
    }, []);

    const filtered = comerciales.filter(
        (c) =>
            c.nombre.toLowerCase().includes(search.toLowerCase()) ||
            c.correo.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm overlay-animate-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-azul-900 border border-azul-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 modal-animate-in z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-azul-800">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-naranja-500" />
                        <h3 className="text-lg font-bold text-white">Agregar Comercial</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-azul-800 text-azul-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-azul-400" />
                        <input
                            type="text"
                            placeholder="Buscar comercial..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-azul-800 border border-azul-700 rounded-xl text-sm text-white placeholder-azul-500 focus:outline-none focus:ring-2 focus:ring-naranja-500/30 focus:border-naranja-500/50"
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar">
                    {loadingComerciales ? (
                        <div className="flex items-center justify-center py-8 text-azul-400">
                            <Loader2 size={20} className="animate-spin mr-2" />
                            <span className="text-sm">Cargando comerciales...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-sm text-azul-500 py-4">
                            {search ? 'Sin resultados' : 'No hay comerciales disponibles'}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map((c) => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedId(c.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                                        ${selectedId === c.id
                                            ? 'bg-naranja-500/15 ring-1 ring-naranja-500/40'
                                            : 'hover:bg-azul-800/60'
                                        }
                                    `}
                                >
                                    <div className="w-9 h-9 rounded-full bg-azul-700 flex items-center justify-center text-azul-200 font-bold text-sm">
                                        {c.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {c.nombre}
                                        </p>
                                        <p className="text-xs text-azul-400 truncate">{c.correo}</p>
                                    </div>
                                    {selectedId === c.id && (
                                        <div className="ml-auto w-5 h-5 rounded-full bg-naranja-500 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">✓</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-azul-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-azul-300 hover:text-white transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => selectedId && onConfirm(selectedId)}
                        disabled={!selectedId || isLoading}
                        className={`
                            flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer
                            ${selectedId && !isLoading
                                ? 'bg-naranja-500 hover:bg-naranja-600 text-white shadow-lg shadow-naranja-500/20'
                                : 'bg-azul-700 text-azul-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {isLoading && <Loader2 size={14} className="animate-spin" />}
                        Crear Instancia
                    </button>
                </div>
            </div>
        </div>
    );
}
