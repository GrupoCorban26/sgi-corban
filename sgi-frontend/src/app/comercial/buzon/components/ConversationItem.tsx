import React from 'react';
import { ChatConversationPreview } from '@/types/chat';
import { User } from 'lucide-react';

interface Props {
    conv: ChatConversationPreview;
    isSelected: boolean;
    onClick: () => void;
}

export default function ConversationItem({ conv, isSelected, onClick }: Props) {
    const timeAgo = (dateStr: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const diff = (new Date().getTime() - d.getTime()) / 60000; // minutes
        if (diff < 1) return 'ahora';
        if (diff < 60) return `${Math.floor(diff)}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        return `${Math.floor(diff / 1440)}d`;
    };

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-emerald-50 hover:bg-emerald-50 border-l-4 border-l-emerald-500 pl-3' : 'border-l-4 border-l-transparent pl-3'
                }`}
        >
            <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className="font-semibold text-gray-800 truncate text-sm">
                    {conv.nombre_whatsapp || conv.telefono}
                </h3>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {timeAgo(conv.ultimo_mensaje_at)}
                </span>
            </div>

            <div className="flex justify-between items-end gap-2 text-sm">
                <p className="text-gray-500 truncate flex-1 min-w-0">
                    {conv.ultimo_mensaje_preview || <span className="italic">Inició una conversación</span>}
                </p>
                {conv.mensajes_no_leidos > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {conv.mensajes_no_leidos}
                    </span>
                )}
            </div>

            <div className="mt-2 flex gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase ${conv.modo === 'BOT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                    {conv.modo}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase bg-gray-100 text-gray-600">
                    {conv.estado.replace('_', ' ')}
                </span>
            </div>
        </div>
    );
}
