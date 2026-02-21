import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { useChatActions } from '@/hooks/comercial/useChat';
import { toast } from 'sonner';

interface Props {
    inboxId: number;
    disabled?: boolean;
}

const QUICK_REPLIES = [
    { label: 'Saludo', text: '¡Buenos días! Soy {nombre} de Grupo Corban. 🚀' },
    { label: 'Solicitar RUC', text: 'Para poder elaborar una cotización, ¿podrías proporcionarme tu RUC y razón social?' },
    { label: 'Cotización', text: 'Te he enviado la cotización por correo. Quedo atento a tus comentarios. 📧' },
    { label: 'Seguimiento', text: '¡Hola! ¿Pudiste revisar la cotización que te envié?' },
    { label: 'Cierre', text: '¡Perfecto! Vamos a iniciar con el proceso. Te contactará nuestro equipo de operaciones.' },
    { label: 'Fuera horario', text: 'Gracias por comunicarte. Te responderé el próximo día hábil. 🕐' },
];

export default function ChatInput({ inboxId, disabled = false }: Props) {
    const [message, setMessage] = useState('');
    const [showQuick, setShowQuick] = useState(false);
    const { sendMessage } = useChatActions();
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = async () => {
        if (!message.trim() || disabled) return;

        try {
            await sendMessage.mutateAsync({ inboxId, contenido: message.trim() });
            setMessage('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto'; // Reset height
            }
        } catch {
            toast.error('Error al enviar mensaje');
        }
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

    // Close options when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowQuick(false);
        if (showQuick) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showQuick]);

    return (
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 border-t border-gray-200 z-10 shrink-0">
            {/* Action buttons left */}
            <div className="flex items-center gap-1 mb-1">
                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors" disabled={disabled}>
                    <Smile size={24} strokeWidth={1.5} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors" disabled={disabled}>
                    <Paperclip size={24} strokeWidth={1.5} />
                </button>
            </div>

            {/* Input Container */}
            <div className="flex-1 relative">
                {/* Quick Replies Dropdown */}
                {showQuick && (
                    <div
                        className="absolute bottom-full mb-3 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-2"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                            Respuestas Rápidas
                        </div>
                        <ul className="max-h-60 overflow-y-auto">
                            {QUICK_REPLIES.map((qr, idx) => (
                                <li
                                    key={idx}
                                    className="px-4 py-3 border-b border-gray-50 hover:bg-emerald-50 cursor-pointer text-sm text-gray-700 transition-colors"
                                    onClick={() => insertQuickReply(qr.text)}
                                >
                                    <span className="font-semibold block mb-0.5">{qr.label}</span>
                                    <span className="text-xs text-gray-500 block truncate">{qr.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="bg-white rounded-xl flex items-end shadow-sm">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowQuick(!showQuick); }}
                        disabled={disabled}
                        className="p-3 text-emerald-600 font-semibold hover:bg-emerald-50 rounded-l-xl transition-colors text-sm"
                        title="Respuestas Rápidas"
                    >
                        /'
                    </button>
                    <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder={disabled ? "Chat bloqueado..." : "Escribe un mensaje, o usa / para rápidas..."}
                        className="flex-1 py-3 px-2 bg-transparent focus:outline-none resize-none min-h-[44px] max-h-[120px] text-gray-800"
                        rows={1}
                    />
                </div>
            </div>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                className={`p-3 rounded-full mb-0.5 flex items-center justify-center transition-all ${message.trim() && !disabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        : 'bg-transparent text-gray-400'
                    }`}
            >
                <Send size={24} strokeWidth={1.5} className={message.trim() ? "ml-0.5" : ""} />
            </button>
        </div>
    );
}
