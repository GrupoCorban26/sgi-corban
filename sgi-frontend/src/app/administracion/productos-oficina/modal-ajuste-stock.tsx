'use client';

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';
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

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                icon={<Plus size={20} className="text-indigo-600" />}
                title="Ajustar Stock"
            />

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Info del producto */}
                {producto && (
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="font-medium text-gray-800">{producto.nombre}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Stock actual: <span className="font-bold text-gray-700">{producto.stock_actual}</span> {producto.unidad_medida}(s)
                        </p>
                    </div>
                )}

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>

                {/* Preview del nuevo stock */}
                {producto && (
                    <div className={`rounded-xl p-3 text-center ${stockInsuficiente ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        <p className="text-sm">
                            Nuevo stock: <span className="font-bold text-lg">{nuevoStock}</span> {producto.unidad_medida}(s)
                        </p>
                        {stockInsuficiente && (
                            <p className="text-xs mt-1 text-red-600">⚠️ Stock insuficiente</p>
                        )}
                    </div>
                )}

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
                        disabled={isLoading || stockInsuficiente || !motivo.trim()}
                        className={`flex-1 px-4 py-2.5 text-sm text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg ${tipo === 'entrada'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            }`}
                    >
                        {isLoading ? 'Procesando...' : `Registrar ${tipo}`}
                    </button>
                </ModalFooter>
            </form>
        </ModalBase>
    );
}
