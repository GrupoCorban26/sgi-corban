'use client';

import React, { useState } from 'react';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
import { FileSpreadsheet, Download, Loader2, Filter } from 'lucide-react';
import { useProductosActivos } from '@/hooks/organizacion/useActivo';
import api from '@/lib/axios';
import { toast } from 'sonner';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ModalExportarContent = () => {
    const { handleClose } = useModalContext();
    const { data: productos = [], isLoading } = useProductosActivos();

    // States
    const [selectedProductos, setSelectedProductos] = useState<string[]>([]);
    const [conLinea, setConLinea] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleToggleProducto = (prod: string) => {
        if (selectedProductos.includes(prod)) {
            setSelectedProductos(prev => prev.filter(p => p !== prod));
        } else {
            setSelectedProductos(prev => [...prev, prod]);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProductos(productos);
        } else {
            setSelectedProductos([]);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params: any = {};

            // Si hay productos seleccionados, enviarlos
            // Si no hay ninguno seleccionado, asumimos que quiere exportar TODO (o nada? User expectation usually is filters apply to restrict. If empty maybe all? Let's assume empty list means ALL for now, or force selection)
            // Better UX: If none selected, send empty list which might mean "all" or specific logic. 
            // In my implementation: "if productos: stmt.where(in_)..." 
            // So if I don't send 'productos', it fetches all.
            // But if user explicitly unchecks all, maybe they want nothing? 
            // Let's implement "If selected is empty, perform full export IF 'Select all' logic is used, or maybe just send what is checked.
            // Let's enforce: If list is empty -> Export ALL. If list has items -> Export only those.
            // To avoid confusion, let's treat "selectedProductos" as the filter. If empty, NO FILTER on products.

            if (selectedProductos.length > 0 && selectedProductos.length < productos.length) {
                // Solo enviamos si es un subconjunto. Si están todos, mejora performance no filtrar
                // Pero como es Query params array, enviamos cada uno
                // Axios handles arrays as duplicate keys: productos=A&productos=B...
                params.productos = selectedProductos;
            }

            if (conLinea) {
                params.con_linea = true;
            }

            const response = await api.get('/activos/exportar/excel', {
                params,
                paramsSerializer: { indexes: null }, // Standard way to serialize arrays in axios for FastAPI
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Archivo descargado correctamente');
            handleClose();
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Error al generar el reporte');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <ModalHeader
                icon={<FileSpreadsheet size={20} className="text-green-600" />}
                title="Exportar Inventario a Excel"
            />

            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Filter size={16} /> Productos
                        </label>
                        <button
                            type="button"
                            onClick={() => handleSelectAll(selectedProductos.length !== productos.length)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {selectedProductos.length === productos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="py-8 flex justify-center text-gray-400">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50">
                            {productos.map(prod => (
                                <label key={prod} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 p-1.5 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedProductos.includes(prod)}
                                        onChange={() => handleToggleProducto(prod)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                    {prod}
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-500">
                        {selectedProductos.length === 0
                            ? "Se exportarán todos los productos."
                            : `Se exportarán ${selectedProductos.length} tipo(s) de producto.`}
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={conLinea}
                                onChange={(e) => setConLinea(e.target.checked)}
                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all"
                            />
                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            Solo activos con <strong>Línea Telefónica</strong> asociada
                        </span>
                    </label>
                </div>
            </div>

            <ModalFooter>
                <button
                    onClick={handleClose}
                    disabled={isExporting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Descargar Excel
                </button>
            </ModalFooter>
        </>
    );
};

export default function ModalExportar(props: ModalProps) {
    return (
        <ModalBase isOpen={props.isOpen} onClose={props.onClose} maxWidth="max-w-md">
            <ModalExportarContent />
        </ModalBase>
    );
}
