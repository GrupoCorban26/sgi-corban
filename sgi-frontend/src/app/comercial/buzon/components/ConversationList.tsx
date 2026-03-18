import React, { useState } from 'react';
import { useChatConversations } from '@/hooks/comercial/useChat';
import { useDisponibilidadBuzon } from '@/hooks/comercial/useDisponibilidad';
import { ChatConversationPreview } from '@/types/chat';
import ConversationItem from './ConversationItem';
import { Loader2, MessageSquareDashed, Search, X, Inbox } from 'lucide-react';
import { useComerciales } from '@/hooks/organizacion/useComerciales';
import Cookies from 'js-cookie';

interface Props {
    selectedId: number | null;
    onSelect: (conv: ChatConversationPreview) => void;
}

const TABS = [
    { id: 'all', label: 'Todos', emoji: '' },
    { id: 'PENDIENTE', label: 'Pendientes', emoji: '⏳' },
    { id: 'EN_GESTION', label: 'Gestión', emoji: '💬' },
    { id: 'COTIZADO', label: 'Cotizados', emoji: '📋' },
];

export default function ConversationList({ selectedId, onSelect }: Props) {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroComercial, setFiltroComercial] = useState<number | ''>('');

    // Verificar si es jefa comercial
    const [isJefa, setIsJefa] = useState(false);
    React.useEffect(() => {
        try {
            const userDataStr = Cookies.get('user_data');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.roles?.includes('JEFE_COMERCIAL')) {
                    setIsJefa(true);
                }
            }
        } catch (e) { console.error(e); }
    }, []);

    const { data: comerciales = [] } = useComerciales();
    const { data: conversations = [], isLoading } = useChatConversations(filtroComercial);
    const { disponible, toggle, isToggling } = useDisponibilidadBuzon();

    const filtered = conversations.filter(c => {
        if (activeTab !== 'all' && c.estado !== activeTab) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (c.nombre_whatsapp?.toLowerCase().includes(term) || c.telefono.includes(term));
        }
        return true;
    });

    // Contadores por estado
    const counts = {
        all: conversations.length,
        PENDIENTE: conversations.filter(c => c.estado === 'PENDIENTE').length,
        EN_GESTION: conversations.filter(c => c.estado === 'EN_GESTION').length,
        COTIZADO: conversations.filter(c => c.estado === 'COTIZADO').length,
    };

    const totalNoLeidos = conversations.reduce((sum, c) => sum + c.mensajes_no_leidos, 0);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Inbox size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">Buzón</h2>
                            {totalNoLeidos > 0 && (
                                <p className="text-[11px] text-emerald-600 font-medium">
                                    {totalNoLeidos} mensaje{totalNoLeidos !== 1 ? 's' : ''} sin leer
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Toggle Disponibilidad */}
                    <button
                        onClick={() => toggle()}
                        disabled={isToggling}
                        className={`
                            relative flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold
                            transition-all duration-300 border
                            ${disponible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm shadow-emerald-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }
                            ${isToggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        title={disponible ? 'Estás recibiendo leads' : 'No estás recibiendo leads'}
                    >
                        <span className={`
                            w-2 h-2 rounded-full transition-all duration-300
                            ${disponible ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-slate-400'}
                        `}>
                            {disponible && (
                                <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                        </span>
                        {disponible ? 'En línea' : 'Ausente'}
                    </button>
                </div>

                {/* Barra de búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar conversación..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-slate-100 border border-transparent rounded-xl text-sm
                            focus:outline-none focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100
                            transition-all duration-200 placeholder:text-slate-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtro Comercial (Solo Jefatura) */}
                {isJefa && (
                    <div className="mt-2 text-xs">
                        <select
                            value={filtroComercial}
                            onChange={(e) => setFiltroComercial(e.target.value ? Number(e.target.value) : '')}
                            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
                        >
                            <option value="">Todos los asesores...</option>
                            {comerciales.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Tabs con contadores */}
            <div className="flex border-b border-slate-100 px-1">
                {TABS.map(tab => {
                    const count = counts[tab.id as keyof typeof counts];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-1 px-2 py-2.5
                                text-xs font-semibold whitespace-nowrap transition-all duration-200 relative
                                ${activeTab === tab.id
                                    ? 'text-emerald-700'
                                    : 'text-slate-400 hover:text-slate-600'
                                }
                            `}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`
                                    text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center
                                    ${activeTab === tab.id
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }
                                `}>
                                    {count}
                                </span>
                            )}

                            {/* Indicador activo */}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-emerald-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Lista de conversaciones */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Loader2 className="animate-spin text-emerald-500" size={24} />
                        <span className="text-xs text-slate-400">Cargando chats...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <MessageSquareDashed size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-1">
                            {searchTerm ? 'Sin resultados' : 'Sin conversaciones'}
                        </p>
                        <p className="text-xs text-slate-400">
                            {searchTerm
                                ? `No se encontró "${searchTerm}"`
                                : 'Las conversaciones nuevas aparecerán aquí'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(conv => (
                            <ConversationItem
                                key={conv.inbox_id}
                                conv={conv}
                                isSelected={selectedId === conv.inbox_id}
                                onClick={() => onSelect(conv)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
