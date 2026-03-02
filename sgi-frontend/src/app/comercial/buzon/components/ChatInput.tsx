import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Zap } from 'lucide-react';
import { useChatActions } from '@/hooks/comercial/useChat';
import { toast } from 'sonner';

interface Props {
    inboxId: number;
    disabled?: boolean;
}

const QUICK_REPLIES = [
    { label: '👋 Saludo', text: '¡Buenos días! Soy {nombre} de Grupo Corban. 🚀' },
    { label: '📋 Solicitar RUC', text: 'Para poder elaborar una cotización, ¿podrías proporcionarme tu RUC y razón social?' },
    { label: '📧 Cotización enviada', text: 'Te he enviado la cotización por correo. Quedo atento a tus comentarios. 📧' },
    { label: '🔄 Seguimiento', text: '¡Hola! ¿Pudiste revisar la cotización que te envié?' },
    { label: '✅ Cierre', text: '¡Perfecto! Vamos a iniciar con el proceso. Te contactará nuestro equipo de operaciones.' },
    { label: '🕐 Fuera horario', text: 'Gracias por comunicarte. Te responderé el próximo día hábil. 🕐' },
];

export default function ChatInput({ inboxId, disabled = false }: Props) {
    const [message, setMessage] = useState('');
    const [showQuick, setShowQuick] = useState(false);
    const { sendMessage } = useChatActions();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const quickRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (!message.trim() || disabled || sendMessage.isPending) return;

        const contenido = message.trim();

        // Limpiar UI instantaneamente (Optimistic Update en useChat se hará cargo)
        setMessage('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.focus();
        }

        // Ejecutar mutación sin await para evitar bloquear el ref de React
        sendMessage.mutate(
            { inboxId, contenido },
            {
                onError: () => {
                    toast.error('Error al enviar mensaje');
                    setMessage(contenido); // Restaurar contenido si falló
                }
            }
        );
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    };

    const insertQuickReply = (text: string) => {
        setMessage(prev => prev + (prev ? '\n' : '') + text);
        setShowQuick(false);
        inputRef.current?.focus();
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
                setShowQuick(false);
            }
        };
        if (showQuick) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showQuick]);

    return (
        <div className="bg-slate-100/95 backdrop-blur-sm px-3 py-2.5 flex items-end gap-2 border-t border-slate-200 z-10 flex-shrink-0">
            {/* Botones izquierda */}
            <div className="flex items-center gap-0.5 mb-1">
                <button
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
                    disabled={disabled}
                    title="Emojis"
                >
                    <Smile size={22} strokeWidth={1.5} />
                </button>
                <button
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
                    disabled={disabled}
                    title="Adjuntar archivo"
                >
                    <Paperclip size={22} strokeWidth={1.5} />
                </button>
            </div>

            {/* Input Container */}
            <div className="flex-1 relative" ref={quickRef}>
                {/* Quick Replies Dropdown */}
                {showQuick && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" />
                            <span className="font-semibold text-xs text-slate-600 uppercase tracking-wider">Respuestas Rápidas</span>
                        </div>
                        <ul className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                            {QUICK_REPLIES.map((qr, idx) => (
                                <li
                                    key={idx}
                                    className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors group"
                                    onClick={() => insertQuickReply(qr.text)}
                                >
                                    <span className="font-semibold text-sm text-slate-700 group-hover:text-emerald-700 block mb-0.5">
                                        {qr.label}
                                    </span>
                                    <span className="text-xs text-slate-400 block line-clamp-1">{qr.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="bg-white rounded-xl flex items-end shadow-sm border border-slate-200/60">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowQuick(!showQuick); }}
                        disabled={disabled}
                        className={`
                            p-3 font-bold rounded-l-xl transition-all text-sm flex-shrink-0
                            ${showQuick
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'text-emerald-500 hover:bg-emerald-50'
                            }
                        `}
                        title="Respuestas Rápidas"
                    >
                        <Zap size={18} />
                    </button>
                    <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={disabled || sendMessage.isPending}
                        placeholder={disabled ? "Chat bloqueado..." : "Escribe un mensaje..."}
                        className="flex-1 py-3 px-1 bg-transparent focus:outline-none resize-none min-h-[44px] max-h-[120px] text-slate-800 text-sm placeholder:text-slate-400 disabled:opacity-50"
                        rows={1}
                    />
                </div>
            </div>

            {/* Botón enviar */}
            <button
                onClick={handleSend}
                disabled={disabled || !message.trim() || sendMessage.isPending}
                className={`
                    p-2.5 rounded-xl mb-0.5 flex items-center justify-center transition-all duration-200
                    ${message.trim() && !disabled && !sendMessage.isPending
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 scale-100 active:scale-95'
                        : 'bg-transparent text-slate-300'
                    }
                `}
            >
                <Send size={20} strokeWidth={1.5} className={message.trim() ? "ml-0.5" : ""} />
            </button>
        </div>
    );
}
