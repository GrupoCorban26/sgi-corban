'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ModalConfirmarProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'warning';
}

export default function ModalConfirmar({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Estás seguro?',
    message = 'Esta acción no se puede deshacer.',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isLoading = false,
    variant = 'danger',
}: ModalConfirmarProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-red-50 text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
        },
        warning: {
            icon: 'bg-amber-50 text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-6">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${styles.icon} flex items-center justify-center mx-auto mb-4`}>
                    <AlertTriangle size={24} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
                <p className="text-sm text-gray-500 text-center mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 ${styles.button} text-white rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-50`}
                    >
                        {isLoading ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
