'use client';

import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { ProductoOficina } from '@/types/organizacion/producto-oficina';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (cantidad: number, motivo: string) => void;
    producto: ProductoOficina | null;
    isLoading: boolean;
}

export default function ModalAjusteStock({ isOpen, onClose, onSubmit, producto, isLoading }: Props) {
    const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
    const [cantidad, setCantidad] = useState(1);
    const [motivo, setMotivo] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cantidadFinal = tipo === 'salida' ? -cantidad : cantidad;
        onSubmit(cantidadFinal, motivo);
    };

    const nuevoStock = producto ? producto.stock_actual + (tipo === 'salida' ? -cantidad : cantidad) : 0;
    const stockInsuficiente = tipo === 'salida' && nuevoStock < 0;

    if (!isOpen || !producto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Ajustar Stock</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Info del producto */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="font-medium text-gray-800">{producto.nombre}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Stock actual: <span className="font-bold text-gray-700">{producto.stock_actual}</span> {producto.unidad_medida}(s)
                        </p>
                    </div>

                    {/* Tipo de ajuste */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setTipo('entrada')}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${tipo === 'entrada'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            <Plus size={16} /> Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipo('salida')}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${tipo === 'salida'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            <Minus size={16} /> Salida
                        </button>
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                        <input
                            type="number"
                            value={cantidad}
                            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                            min={1}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Motivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                        <input
                            type="text"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            required
                            maxLength={200}
                            placeholder={tipo === 'entrada' ? 'Ej: Compra mensual' : 'Ej: Entrega a área comercial'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Preview del nuevo stock */}
                    <div className={`rounded-xl p-3 text-center ${stockInsuficiente ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                        <p className="text-sm">
                            Nuevo stock: <span className="font-bold text-lg">{nuevoStock}</span> {producto.unidad_medida}(s)
                        </p>
                        {stockInsuficiente && (
                            <p className="text-xs mt-1 text-red-600">⚠️ Stock insuficiente</p>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || stockInsuficiente || !motivo.trim()}
                            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tipo === 'entrada'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {isLoading ? 'Procesando...' : `Registrar ${tipo}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
