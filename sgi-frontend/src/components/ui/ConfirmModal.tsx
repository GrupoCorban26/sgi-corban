'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ModalBase, ModalFooter } from '@/components/ui/modal';

interface ConfirmModalProps {
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

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Estás seguro?',
    message = 'Esta acción no se puede deshacer.',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isLoading = false,
    variant = 'danger',
}: ConfirmModalProps) {
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
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
            <div className="p-6">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${styles.icon} flex items-center justify-center mx-auto mb-4`}>
                    <AlertTriangle size={24} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
                <p className="text-sm text-gray-500 text-center mb-6">{message}</p>

                {/* Actions */}
                <ModalFooter>
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
                        className={`flex-1 px-4 py-2.5 ${styles.button} text-white rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : confirmText}
                    </button>
                </ModalFooter>
            </div>
        </ModalBase>
    );
}

// Default export for backwards compatibility
export default ConfirmModal;
