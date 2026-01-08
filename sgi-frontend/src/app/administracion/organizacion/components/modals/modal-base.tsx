'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

// ============================================
// ESTILOS CSS PARA ANIMACIONES
// ============================================
const modalStyles = `
  @keyframes modalScaleIn {
    0% {
      opacity: 0;
      transform: scale(0.9) translate(-50%, -50%);
    }
    100% {
      opacity: 1;
      transform: scale(1) translate(-50%, -50%);
    }
  }

  @keyframes modalScaleOut {
    0% {
      opacity: 1;
      transform: scale(1) translate(-50%, -50%);
    }
    100% {
      opacity: 0;
      transform: scale(0.9) translate(-50%, -50%);
    }
  }

  @keyframes overlayFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes overlayFadeOut {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  .modal-animate-in {
    animation: modalScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    position: fixed;
    top: 50%;
    left: 50%;
    transform-origin: center center;
  }

  .modal-animate-out {
    animation: modalScaleOut 0.2s cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
    position: fixed;
    top: 50%;
    left: 50%;
    transform-origin: center center;
  }

  .overlay-animate-in {
    animation: overlayFadeIn 0.2s ease-out forwards;
  }

  .overlay-animate-out {
    animation: overlayFadeOut 0.2s ease-out forwards;
  }
`;

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
        <>
            <style>{modalStyles}</style>
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
        </>
    );
}

// ============================================
// COMPONENTE MODAL HEADER
// ============================================
interface ModalHeaderProps {
    icon: React.ReactNode;
    title: string;
    onClose: () => void;
    disableClose?: boolean;
}

export function ModalHeader({ icon, title, onClose, disableClose = false }: ModalHeaderProps) {
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
                onClick={onClose}
                disabled={disableClose}
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
