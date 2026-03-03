'use client';

import React, { useState } from 'react';
import { ShoppingBag, Plus, Pencil, Trash2, Search, Loader2, Settings, PackagePlus, PackageMinus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useProductosOficina, useCategorias } from '@/hooks/organizacion/useProductosOficina';
import { ProductoOficina, ProductoOficinaCreate, ProductoOficinaUpdate } from '@/types/organizacion/producto-oficina';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ModalProducto from './modal-producto';
import ModalAjusteStock from './modal-ajuste-stock';
import ModalCategorias from './modal-categorias';

export default function ProductosOficinaPage() {
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
    const [soloStockBajo, setSoloStockBajo] = useState(false);
    const [page, setPage] = useState(1);

    const [isProductoOpen, setIsProductoOpen] = useState(false);
    const [isAjusteOpen, setIsAjusteOpen] = useState(false);
    const [isCategoriasOpen, setIsCategoriasOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [selectedProducto, setSelectedProducto] = useState<ProductoOficina | null>(null);
    const [productoToDelete, setProductoToDelete] = useState<ProductoOficina | null>(null);

    const { categorias, isLoading: loadingCategorias, createMutation: crearCat, updateMutation: actualizarCat, deleteMutation: eliminarCat } = useCategorias();
    const { productos, pagination, isLoading, isFetching, createMutation, updateMutation, deleteMutation, ajusteStockMutation } = useProductosOficina(
        busqueda, categoriaFiltro, soloStockBajo, page, 15
    );

    // Handlers del modal producto
    const handleOpenCreate = () => {
        setSelectedProducto(null);
        setIsProductoOpen(true);
    };

    const handleEdit = (producto: ProductoOficina) => {
        setSelectedProducto(producto);
        setIsProductoOpen(true);
    };

    const handleProductoSubmit = async (datos: ProductoOficinaCreate | ProductoOficinaUpdate) => {
        try {
            if (selectedProducto) {
                await updateMutation.mutateAsync({ id: selectedProducto.id, datos: datos as ProductoOficinaUpdate });
                toast.success('Producto actualizado correctamente');
            } else {
                await createMutation.mutateAsync(datos as ProductoOficinaCreate);
                toast.success('Producto creado correctamente');
            }
            setIsProductoOpen(false);
        } catch {
            toast.error('Error al guardar el producto');
        }
    };

    // Handler ajuste stock
    const handleAjusteStock = (producto: ProductoOficina) => {
        setSelectedProducto(producto);
        setIsAjusteOpen(true);
    };

    const handleAjusteSubmit = async (cantidad: number, motivo: string) => {
        if (!selectedProducto) return;
        try {
            await ajusteStockMutation.mutateAsync({ id: selectedProducto.id, ajuste: { cantidad, motivo } });
            toast.success(cantidad > 0 ? 'Entrada registrada' : 'Salida registrada');
            setIsAjusteOpen(false);
        } catch {
            toast.error('Error al ajustar stock');
        }
    };

    // Handler eliminar
    const handleDelete = (producto: ProductoOficina) => {
        setProductoToDelete(producto);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!productoToDelete) return;
        try {
            await deleteMutation.mutateAsync(productoToDelete.id);
            toast.success('Producto eliminado correctamente');
            setIsConfirmOpen(false);
            setProductoToDelete(null);
        } catch {
            toast.error('Error al eliminar el producto');
        }
    };

    // Badge de stock
    const getStockBadge = (actual: number, minimo: number) => {
        if (actual === 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle size={12} /> Agotado
                </span>
            );
        }
        if (actual <= minimo) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle size={12} /> {actual}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                {actual}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Productos de Oficina</h1>
                    <p className="text-sm text-gray-500">Gestión de insumos, útiles y merchandising</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCategoriasOpen(true)}
                        className="cursor-pointer flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
                    >
                        <Settings size={18} /> Categorías
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-colors"
                    >
                        <Plus size={18} /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, ubicación o categoría..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                    <div className="relative w-full md:w-56">
                        <select
                            value={categoriaFiltro ?? ''}
                            onChange={(e) => { setCategoriaFiltro(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm appearance-none bg-white"
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
                        <input
                            type="checkbox"
                            checked={soloStockBajo}
                            onChange={(e) => { setSoloStockBajo(e.target.checked); setPage(1); }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <AlertTriangle size={14} className="text-amber-500" />
                        Stock bajo
                    </label>
                    <div className="text-sm text-gray-500 flex items-center gap-2 whitespace-nowrap">
                        <ShoppingBag size={16} />
                        <span>{pagination.total} productos</span>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ubicación</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
                                        <p className="text-sm text-gray-500 mt-2">Cargando productos...</p>
                                    </td>
                                </tr>
                            ) : productos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <ShoppingBag size={40} className="text-gray-300 mx-auto" />
                                        <p className="text-sm text-gray-500 mt-2">No hay productos registrados</p>
                                        <button
                                            onClick={handleOpenCreate}
                                            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            Registrar primer producto →
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                productos.map((producto) => (
                                    <tr
                                        key={producto.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-800">{producto.nombre}</p>
                                            {producto.observaciones && (
                                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{producto.observaciones}</p>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {producto.categoria_nombre ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                    {producto.categoria_nombre}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Sin categoría</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {getStockBadge(producto.stock_actual, producto.stock_minimo)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                                            {producto.unidad_medida}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {producto.ubicacion || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                                            {producto.precio_unitario
                                                ? `S/. ${Number(producto.precio_unitario).toFixed(2)}`
                                                : <span className="text-gray-400">-</span>
                                            }
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={() => handleAjusteStock(producto)}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                    title="Entrada de stock"
                                                >
                                                    <PackagePlus size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedProducto(producto); setIsAjusteOpen(true); }}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                                    title="Salida de stock"
                                                >
                                                    <PackageMinus size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(producto)}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(producto)}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Página {pagination.page} de {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isFetching}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || isFetching}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            <ModalProducto
                isOpen={isProductoOpen}
                onClose={() => setIsProductoOpen(false)}
                onSubmit={handleProductoSubmit}
                producto={selectedProducto}
                categorias={categorias}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <ModalAjusteStock
                isOpen={isAjusteOpen}
                onClose={() => setIsAjusteOpen(false)}
                onSubmit={handleAjusteSubmit}
                producto={selectedProducto}
                isLoading={ajusteStockMutation.isPending}
            />

            <ModalCategorias
                isOpen={isCategoriasOpen}
                onClose={() => setIsCategoriasOpen(false)}
                categorias={categorias}
                onCreate={async (datos) => {
                    try {
                        await crearCat.mutateAsync(datos);
                        toast.success('Categoría creada');
                    } catch { toast.error('Error al crear categoría'); }
                }}
                onUpdate={async (id, datos) => {
                    try {
                        await actualizarCat.mutateAsync({ id, datos });
                        toast.success('Categoría actualizada');
                    } catch { toast.error('Error al actualizar categoría'); }
                }}
                onDelete={async (id) => {
                    try {
                        await eliminarCat.mutateAsync(id);
                        toast.success('Categoría eliminada');
                    } catch { toast.error('Error al eliminar categoría'); }
                }}
                isLoading={loadingCategorias}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => { setIsConfirmOpen(false); setProductoToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar producto?"
                message={`Estás a punto de eliminar "${productoToDelete?.nombre}". El producto será dado de baja.`}
                confirmText="Eliminar"
                isLoading={deleteMutation.isPending}
                variant="danger"
            />
        </div>
    );
}
