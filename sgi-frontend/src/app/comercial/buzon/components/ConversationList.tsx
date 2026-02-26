import React, { useState } from 'react';
import { useChatConversations } from '@/hooks/comercial/useChat';
import { useDisponibilidadBuzon } from '@/hooks/comercial/useDisponibilidad';
import { ChatConversationPreview } from '@/types/chat';
import ConversationItem from './ConversationItem';
import { Loader2, MessageSquare, Search } from 'lucide-react';

interface Props {
    selectedId: number | null;
    onSelect: (conv: ChatConversationPreview) => void;
}

const TABS = [
    { id: 'all', label: 'Todos' },
    { id: 'NUEVO', label: 'Nuevos' },
    { id: 'EN_GESTION', label: 'En Gestión' },
    { id: 'PENDIENTE', label: 'Pendientes' },
];

export default function ConversationList({ selectedId, onSelect }: Props) {
    const { data: conversations = [], isLoading } = useChatConversations();
    const { disponible, toggle, isToggling } = useDisponibilidadBuzon();
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = conversations.filter(c => {
        if (activeTab !== 'all' && c.estado !== activeTab) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (c.nombre_whatsapp?.toLowerCase().includes(term) || c.telefono.includes(term));
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Header, Search & Toggle */}
            <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Chats</h2>

                    {/* Toggle Disponibilidad */}
                    <button
                        onClick={() => toggle()}
                        disabled={isToggling}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                            transition-all duration-200 border
                            ${disponible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }
                            ${isToggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        title={disponible ? 'Estás recibiendo leads' : 'No estás recibiendo leads'}
                    >
                        <span className={`
                            w-2 h-2 rounded-full transition-colors duration-200
                            ${disponible ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}
                        `} />
                        {disponible ? 'Disponible' : 'No disponible'}
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o número..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar border-b border-gray-100 px-2 py-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${activeTab === tab.id
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pt-2">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-emerald-500" size={24} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <MessageSquare size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">No hay conversaciones</p>
                    </div>
                ) : (
                    filtered.map(conv => (
                        <ConversationItem
                            key={conv.inbox_id}
                            conv={conv}
                            isSelected={selectedId === conv.inbox_id}
                            onClick={() => onSelect(conv)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
