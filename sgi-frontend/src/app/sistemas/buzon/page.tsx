'use client';

import { useState } from 'react';
import { MessageSquare, Users, ListX, Clock, Bot } from 'lucide-react';
import TabDisponibilidad from './components/TabDisponibilidad';
import TabMotivos from './components/TabMotivos';
import TabHorarioSLA from './components/TabHorarioSLA';
import TabMensajes from './components/TabMensajes';

const TABS = [
  { id: 'disponibilidad', label: 'Disponibilidad', icon: Users },
  { id: 'motivos', label: 'Motivos Descarte', icon: ListX },
  { id: 'horario', label: 'Horario y SLA', icon: Clock },
  { id: 'mensajes', label: 'Mensajes Bot', icon: Bot },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function BuzonConfigPage() {
  const [activeTab, setActiveTab] = useState<TabId>('disponibilidad');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-azul-700 via-azul-600 to-azul-500 p-6 shadow-xl shadow-azul-900/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
            <MessageSquare className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Configuración del Buzón</h1>
            <p className="text-azul-200 text-sm mt-0.5">Gestiona la disponibilidad, horarios, SLA y mensajes del chatbot</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`cursor-pointer flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-azul-500 text-azul-600 bg-azul-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-5">
          {activeTab === 'disponibilidad' && <TabDisponibilidad />}
          {activeTab === 'motivos' && <TabMotivos />}
          {activeTab === 'horario' && <TabHorarioSLA />}
          {activeTab === 'mensajes' && <TabMensajes />}
        </div>
      </div>
    </div>
  );
}
