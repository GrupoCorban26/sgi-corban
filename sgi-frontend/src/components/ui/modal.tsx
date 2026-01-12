'use client';

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { X } from 'lucide-react';

// Contexto para el modal
interface ModalContextValue {
    handleClose: () => void;
    isClosing: boolean;
    disableClose: boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModalContext = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModalContext must be used within ModalBase');
    }
    return context;
};

// Duración de la animación de cierre (debe coincidir con CSS)
const CLOSE_ANIMATION_DURATION = 200;

// ============================================
// TIPOS
// ============================================
interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
    disableClose?: boolean;
}

// ============================================
// COMPONENTE MODAL BASE
// ============================================
export function ModalBase({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-xl',
    disableClose = false
}: ModalBaseProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Manejar apertura
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        }
    }, [isOpen]);

    // Función para cerrar con animación
    const handleClose = useCallback(() => {
        if (disableClose) return;

        setIsClosing(true);
        setTimeout(() => {
            setShouldRender(false);
            setIsClosing(false);
            onClose();
        }, CLOSE_ANIMATION_DURATION);
    }, [disableClose, onClose]);

    // Cerrar con tecla Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !disableClose && !isClosing) {
                handleClose();
            }
        };
        if (shouldRender) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shouldRender, disableClose, isClosing, handleClose]);

    if (!shouldRender) return null;

    return (
        <ModalContext.Provider value={{ handleClose, isClosing, disableClose }}>
            <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Overlay */}
                <div
                    className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm ${isClosing ? 'overlay-animate-out' : 'overlay-animate-in'
                        }`}
                    onClick={handleClose}
                    aria-hidden="true"
                />

                {/* Modal Container */}
                <div
                    className={`${isClosing ? 'modal-animate-out' : 'modal-animate-in'
                        } bg-white w-full ${maxWidth} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
                >
                    {children}
                </div>
            </div>
        </ModalContext.Provider>
    );
}

// ============================================
// COMPONENTE MODAL HEADER
// ============================================
interface ModalHeaderProps {
    icon: React.ReactNode;
    title: string;
    onClose?: () => void; // Opcional, se obtiene del contexto si está disponible
    disableClose?: boolean; // Opcional, se obtiene del contexto si está disponible
}

export function ModalHeader({ icon, title, onClose, disableClose }: ModalHeaderProps) {
    // Obtener del contexto si está disponible
    const context = useContext(ModalContext);

    // Usar contexto si existe, sino usar props
    const closeHandler = context?.handleClose ?? onClose;
    const isDisabled = context?.disableClose ?? disableClose ?? false;

    return (
        <header className="flex items-center justify-between p-5 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    {icon}
                </div>
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            </div>
            <button
                type="button"
                onClick={closeHandler}
                disabled={isDisabled}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50"
                aria-label="Cerrar modal"
            >
                <X size={22} />
            </button>
        </header>
    );
}

// ============================================
// COMPONENTE MODAL FOOTER
// ============================================
interface ModalFooterProps {
    children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
    return (
        <footer className="p-5 border-t bg-gray-50/50 flex gap-3 shrink-0">
            {children}
        </footer>
    );
}
