'use client';

import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { ProductoOficina, ProductoOficinaCreate, ProductoOficinaUpdate, CategoriaProductoOficina } from '@/types/organizacion/producto-oficina';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (datos: ProductoOficinaCreate | ProductoOficinaUpdate) => void;
    producto?: ProductoOficina | null;
    categorias: CategoriaProductoOficina[];
    isLoading: boolean;
}

const UNIDADES = ['unidad', 'caja', 'paquete', 'docena', 'resma', 'rollo', 'frasco', 'sobre', 'par'];

export default function ModalProducto({ isOpen, onClose, onSubmit, producto, categorias, isLoading }: Props) {
    const [nombre, setNombre] = useState('');
    const [categoriaId, setCategoriaId] = useState<number | null>(null);
    const [unidadMedida, setUnidadMedida] = useState('unidad');
    const [stockActual, setStockActual] = useState(0);
    const [stockMinimo, setStockMinimo] = useState(0);
    const [precioUnitario, setPrecioUnitario] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const esEdicion = !!producto;

    useEffect(() => {
        if (producto) {
            setNombre(producto.nombre);
            setCategoriaId(producto.categoria_id);
            setUnidadMedida(producto.unidad_medida);
            setStockActual(producto.stock_actual);
            setStockMinimo(producto.stock_minimo);
            setPrecioUnitario(producto.precio_unitario?.toString() || '');
            setUbicacion(producto.ubicacion || '');
            setObservaciones(producto.observaciones || '');
        } else {
            setNombre('');
            setCategoriaId(null);
            setUnidadMedida('unidad');
            setStockActual(0);
            setStockMinimo(0);
            setPrecioUnitario('');
            setUbicacion('');
            setObservaciones('');
        }
    }, [producto, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (esEdicion) {
            const datos: ProductoOficinaUpdate = {};
            if (nombre !== producto!.nombre) datos.nombre = nombre;
            if (categoriaId !== producto!.categoria_id) datos.categoria_id = categoriaId;
            if (unidadMedida !== producto!.unidad_medida) datos.unidad_medida = unidadMedida;
            if (stockMinimo !== producto!.stock_minimo) datos.stock_minimo = stockMinimo;
            if (precioUnitario !== (producto!.precio_unitario?.toString() || ''))
                datos.precio_unitario = precioUnitario ? parseFloat(precioUnitario) : null;
            if (ubicacion !== (producto!.ubicacion || '')) datos.ubicacion = ubicacion;
            if (observaciones !== (producto!.observaciones || '')) datos.observaciones = observaciones;
            onSubmit(datos);
        } else {
            const datos: ProductoOficinaCreate = {
                nombre,
                categoria_id: categoriaId,
                unidad_medida: unidadMedida,
                stock_actual: stockActual,
                stock_minimo: stockMinimo,
                precio_unitario: precioUnitario ? parseFloat(precioUnitario) : undefined,
                ubicacion: ubicacion || undefined,
                observaciones: observaciones || undefined,
            };
            onSubmit(datos);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                icon={<Package size={20} className="text-indigo-600" />}
                title={esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
            />

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        maxLength={150}
                        placeholder="Ej: Lapicero azul Pilot"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>

                {/* Categoría y Unidad */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select
                            value={categoriaId ?? ''}
                            onChange={(e) => setCategoriaId(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">Sin categoría</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
                        <select
                            value={unidadMedida}
                            onChange={(e) => setUnidadMedida(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            {UNIDADES.map((u) => (
                                <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stock (solo en creación) y Stock mínimo */}
                <div className="grid grid-cols-2 gap-3">
                    {!esEdicion && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                            <input
                                type="number"
                                value={stockActual}
                                onChange={(e) => setStockActual(parseInt(e.target.value) || 0)}
                                min={0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    )}
                    <div className={esEdicion ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                        <input
                            type="number"
                            value={stockMinimo}
                            onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                            min={0}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">Se mostrará alerta si el stock cae por debajo</p>
                    </div>
                </div>

                {/* Precio y Ubicación */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario (S/.)</label>
                        <input
                            type="number"
                            value={precioUnitario}
                            onChange={(e) => setPrecioUnitario(e.target.value)}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                        <input
                            type="text"
                            value={ubicacion}
                            onChange={(e) => setUbicacion(e.target.value)}
                            maxLength={100}
                            placeholder="Ej: Estante 3, Gaveta B"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Observaciones */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        placeholder="Notas adicionales..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    />
                </div>

                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !nombre.trim()}
                        className="flex-1 px-4 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-200"
                    >
                        {isLoading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
                    </button>
                </ModalFooter>
            </form>
        </ModalBase>
    );
}
