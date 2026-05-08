'use client';

import React from 'react';
import { useInstanciaQR } from '@/hooks/comercial/useSupervision';
import { X, Loader2, CheckCircle, Wifi, WifiOff } from 'lucide-react';

interface ModalQRProps {
    instanciaId: number;
    onClose: () => void;
}

export default function ModalQR({ instanciaId, onClose }: ModalQRProps) {
    const { data, isLoading } = useInstanciaQR(instanciaId);

    const isConnected = data?.estado === 'CONECTADO';

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
                    <h3 className="text-lg font-bold text-white">Vincular WhatsApp</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-azul-800 text-azul-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center">
                    {isConnected ? (
                        /* Conectado */
                        <div className="flex flex-col items-center py-8">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <h4 className="text-lg font-bold text-emerald-400">¡Conectado!</h4>
                            <p className="text-sm text-azul-300 mt-2 text-center">
                                WhatsApp vinculado correctamente.
                                Los mensajes comenzarán a llegar automáticamente.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : isLoading ? (
                        /* Cargando */
                        <div className="flex flex-col items-center py-8">
                            <Loader2 size={32} className="animate-spin text-azul-400 mb-3" />
                            <p className="text-sm text-azul-300">Obteniendo QR...</p>
                        </div>
                    ) : data?.qr_code ? (
                        /* QR disponible */
                        <>
                            <div className="bg-white rounded-xl p-4 mb-4 shadow-lg">
                                <img
                                    src={data.qr_code}
                                    alt="QR Code WhatsApp"
                                    className="w-64 h-64 object-contain"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-azul-200 font-medium">
                                    Escanea con WhatsApp
                                </p>
                                <ol className="text-xs text-azul-400 mt-3 space-y-1 text-left">
                                    <li>1. Abre WhatsApp en el celular corporativo</li>
                                    <li>2. Toca <strong className="text-azul-200">Dispositivos vinculados</strong></li>
                                    <li>3. Toca <strong className="text-azul-200">Vincular un dispositivo</strong></li>
                                    <li>4. Escanea este código QR</li>
                                </ol>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs text-azul-500">
                                <Loader2 size={12} className="animate-spin" />
                                <span>El QR se actualiza cada 10 segundos</span>
                            </div>
                        </>
                    ) : (
                        /* Sin QR */
                        <div className="flex flex-col items-center py-8">
                            <WifiOff size={32} className="text-red-400 mb-3" />
                            <p className="text-sm text-azul-300 text-center">
                                {data?.message || 'No se pudo obtener el QR. Intenta de nuevo.'}
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-4 py-2 bg-azul-700 hover:bg-azul-600 text-white text-sm rounded-lg transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
