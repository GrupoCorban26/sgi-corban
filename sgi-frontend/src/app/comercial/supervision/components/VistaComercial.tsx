'use client';

import React from 'react';
import { useMiInstancia, useMiInstanciaQR } from '@/hooks/comercial/useSupervision';
import { Wifi, Loader2, QrCode, Smartphone, CheckCircle } from 'lucide-react';

export default function VistaComercial() {
    const { instancia, isLoading, crearMutation } = useMiInstancia();
    const needsQR = !!instancia && instancia.estado !== 'CONECTADO';
    const { data: qrData, isLoading: loadingQR } = useMiInstanciaQR(needsQR);

    const handleCrear = async () => {
        try {
            await crearMutation.mutateAsync();
        } catch {
            // Error handling via query
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="flex flex-col items-center gap-3 text-azul-500">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm">Cargando...</span>
                </div>
            </div>
        );
    }

    // Sin instancia → Botón para crear
    if (!instancia) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-azul-100 flex items-center justify-center">
                        <Smartphone size={32} className="text-azul-500" />
                    </div>
                    <h2 className="text-xl font-bold text-azul-900 mb-2">
                        Conecta tu WhatsApp
                    </h2>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Vincula tu número corporativo para que tu jefe pueda supervisar
                        las conversaciones comerciales.
                    </p>
                    <button
                        onClick={handleCrear}
                        disabled={crearMutation.isPending}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-naranja-500 hover:bg-naranja-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-naranja-500/20 cursor-pointer disabled:opacity-50"
                    >
                        {crearMutation.isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <QrCode size={18} />
                        )}
                        Vincular WhatsApp
                    </button>
                </div>
            </div>
        );
    }

    // Conectado → Tarjeta de estado
    if (instancia.estado === 'CONECTADO') {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-md text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-azul-900 mb-1">
                        WhatsApp Conectado
                    </h2>
                    {instancia.profile_name && (
                        <p className="text-sm text-slate-600 font-medium">
                            {instancia.profile_name}
                        </p>
                    )}
                    {instancia.telefono && (
                        <p className="text-sm text-slate-400 mt-1">
                            +{instancia.telefono}
                        </p>
                    )}
                    <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600 text-sm">
                        <Wifi size={16} />
                        <span className="font-medium">En línea</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                        Las conversaciones se están registrando automáticamente.
                    </p>
                </div>
            </div>
        );
    }

    // Conectando → Mostrar QR
    return (
        <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-lg text-center">
                <h2 className="text-xl font-bold text-azul-900 mb-2">
                    Escanea el código QR
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                    Abre WhatsApp en tu celular corporativo y escanea este código
                </p>

                {loadingQR ? (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 size={32} className="animate-spin text-azul-400 mb-3" />
                        <span className="text-sm text-slate-400">Generando QR...</span>
                    </div>
                ) : qrData?.qr_code ? (
                    <>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 inline-block shadow-sm mb-6">
                            <img
                                src={qrData.qr_code}
                                alt="QR Code WhatsApp"
                                className="w-64 h-64 object-contain"
                            />
                        </div>

                        <ol className="text-xs text-slate-500 space-y-1.5 text-left max-w-xs mx-auto">
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-azul-500 min-w-[16px]">1.</span>
                                Abre WhatsApp en tu celular
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-azul-500 min-w-[16px]">2.</span>
                                Toca <strong>Dispositivos vinculados</strong>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-azul-500 min-w-[16px]">3.</span>
                                Toca <strong>Vincular un dispositivo</strong>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-azul-500 min-w-[16px]">4.</span>
                                Escanea este código QR
                            </li>
                        </ol>

                        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
                            <Loader2 size={12} className="animate-spin" />
                            <span>El QR se actualiza automáticamente</span>
                        </div>
                    </>
                ) : (
                    <div className="py-12">
                        <QrCode size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-slate-400">
                            {qrData?.message || 'Esperando QR...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
