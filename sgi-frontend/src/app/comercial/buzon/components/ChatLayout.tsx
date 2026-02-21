import React, { useState } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import LeadInfoPanel from './LeadInfoPanel';
import { ChatConversationPreview } from '@/types/chat';

export default function ChatLayout() {
    const [selectedConv, setSelectedConv] = useState<ChatConversationPreview | null>(null);

    return (
        <div className="flex h-full w-full bg-white divide-x divide-gray-200 shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {/* 1. Panel Izquierdo: Lista de Conversaciones */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] h-full flex flex-col bg-gray-50/50">
                <ConversationList
                    selectedId={selectedConv?.inbox_id || null}
                    onSelect={setSelectedConv}
                />
            </div>

            {/* 2. Panel Central: Ventana de Chat */}
            <div className="flex-1 h-full min-w-0 bg-[#EFEAE2]">
                <ChatWindow selectedConv={selectedConv} />
            </div>

            {/* 3. Panel Derecho: Info del Lead (Solo visible si hay chat seleccionado) */}
            {selectedConv && (
                <div className="w-1/4 min-w-[300px] max-w-[360px] h-full bg-white hidden lg:block overflow-y-auto">
                    <LeadInfoPanel selectedConv={selectedConv} onChangeConv={setSelectedConv} />
                </div>
            )}
        </div>
    );
}
