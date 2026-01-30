'use client';

import React, { useState } from 'react';
import { X, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { useLineas } from '@/hooks/organizacion/useLineas';
import { useActivos } from '@/hooks/organizacion/useActivo';
import { Linea } from '@/types/organizacion/linea';
import { SearchableSelect, Option } from '@/components/ui/SearchableSelect';

interface ModalCambiarCelularProps {
    isOpen: boolean;
    onClose: () => void;
    linea: Linea | null;
}

export default function ModalCambiarCelular({ isOpen, onClose, linea }: ModalCambiarCelularProps) {
    const [nuevoActivoId, setNuevoActivoId] = useState<number | string | null>(null);
    const [observaciones, setObservaciones] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { cambiarCelularMutation } = useLineas();

    // Pasamos isDisponible=null para buscar en todos los activos (incluso asignados a empleados)
    // Pasamos sinLinea=true para filtrar solo los que NO tienen línea
    const { activos, isLoading: loadingActivos, refetch } = useActivos(
        searchQuery, // busqueda
        null, // estadoFisico
        null, // isDisponible (antes true)
        null, // empleadoId
        1, // page
        20, // pageSize
        true // sinLinea
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linea || !nuevoActivoId) return;

        try {
            await cambiarCelularMutation.mutateAsync({
                id: linea.id,
                data: {
                    nuevo_activo_id: Number(nuevoActivoId),
                    observaciones: observaciones || undefined
                }
            });
            toast.success('Celular cambiado correctamente');
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al cambiar el celular');
        }
    };

    const handleClose = () => {
        onClose();
        setNuevoActivoId(null);
        setObservaciones('');
        setSearchQuery('');
    };

    if (!isOpen || !linea) return null;

    const options: Option[] = activos.map(a => ({
        id: a.id,
        label: `${a.producto} ${a.marca || ''}`,
        subLabel: `IMEI/Serie: ${a.serie || 'N/A'} - Código: ${a.codigo_inventario || 'N/A'}`
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Smartphone className="text-blue-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Cambiar Celular</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Info */}
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                    <p className="text-sm text-blue-800">
                        <strong>Línea:</strong> {linea.numero} ({linea.gmail})
                    </p>
                    {linea.activo_nombre && (
                        <p className="text-sm text-blue-600 mt-1">
                            <strong>Celular actual:</strong> {linea.activo_nombre}
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Celular *</label>
                        <SearchableSelect
                            value={nuevoActivoId}
                            onChange={setNuevoActivoId}
                            onSearch={setSearchQuery}
                            options={options}
                            loading={loadingActivos}
                            placeholder="Buscar dispositivo (ej. IMEI, marca)..."
                            searchPlaceholder="Escriba para buscar..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Busque por Serie/IMEI, Marca o Producto.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del cambio</label>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={2}
                            placeholder="Ej: Celular anterior dañado"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={cambiarCelularMutation.isPending || !nuevoActivoId}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {cambiarCelularMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                            Cambiar Celular
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
