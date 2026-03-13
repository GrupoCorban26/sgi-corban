'use client';

import React, { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';

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

    const { activos, isLoading: loadingActivos } = useActivos(
        searchQuery,
        null,
        null,
        null,
        1,
        20,
        true
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
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err?.response?.data?.detail || 'Error al cambiar el celular');
        }
    };

    const handleClose = () => {
        onClose();
        setNuevoActivoId(null);
        setObservaciones('');
        setSearchQuery('');
    };

    const options: Option[] = (linea ? activos : []).map(a => ({
        id: a.id,
        label: `${a.producto} ${a.marca || ''}`,
        subLabel: `IMEI/Serie: ${a.serie || 'N/A'} - Código: ${a.codigo_inventario || 'N/A'}`
    }));

    return (
        <ModalBase isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md">
            <ModalHeader
                icon={<Smartphone size={20} className="text-blue-600" />}
                title="Cambiar Celular"
            />

            {/* Info */}
            {linea && (
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
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

                <ModalFooter>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={cambiarCelularMutation.isPending || !nuevoActivoId}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold shadow-lg shadow-blue-200"
                    >
                        {cambiarCelularMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                        Cambiar Celular
                    </button>
                </ModalFooter>
            </form>
        </ModalBase>
    );
}
