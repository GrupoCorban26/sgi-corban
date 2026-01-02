'use client';

import React, { useState } from 'react';
import { 
  GitGraph, 
  Users, 
  Briefcase, 
  Plus, 
  LayoutGrid, 
  ChevronDown 
} from 'lucide-react';

// Importación de tus componentes locales
import { TabButton } from './components/tab-button';
import { EstructuraTab } from './components/estructura-tab';
import { ColaboradoresTab } from './components/colaboradores-tab';
import { AuditoriaPanel } from './components/auditoria-panel';
import ModalCrearEntidad from './components/modal-crear';

export default function OrganizacionPage() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('estructura');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  // Estados para el Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'departamento' | 'area' | 'cargo'>('departamento');

  // --- FUNCIONES MANEJADORAS ---
  const openHistory = (entity: any) => {
    setSelectedEntity(entity);
    setShowHistory(true);
  };

  const handleOpenModal = (type: 'departamento' | 'area' | 'cargo') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      
      {/* 1. CABECERA: Título y Botones de Acción Rápida */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión Organizacional</h1>
          <p className="text-sm text-gray-500">Jerarquía: Departamentos {'>'} Áreas {'>'} Cargos</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleOpenModal('departamento')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-indigo-100"
          >
            <Plus size={16} /> <span>Depto.</span>
          </button>
          <button 
            onClick={() => handleOpenModal('area')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-100"
          >
            <Plus size={16} /> <span>Área</span>
          </button>
          <button 
            onClick={() => handleOpenModal('cargo')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-purple-100"
          >
            <Plus size={16} /> <span>Cargo</span>
          </button>
        </div>
      </div>

      {/* 2. NAVEGACIÓN POR PESTAÑAS (TABS) */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200 w-fit">
        <TabButton 
          active={activeTab === 'estructura'} 
          onClick={() => setActiveTab('estructura')} 
          icon={<LayoutGrid size={18} />} 
          label="Estructura" 
        />
        <TabButton 
          active={activeTab === 'colaboradores'} 
          onClick={() => setActiveTab('colaboradores')} 
          icon={<Users size={18} />} 
          label="Colaboradores" 
        />
      </div>

      {/* 3. CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-125 overflow-hidden">
        {activeTab === 'estructura' && (
          <EstructuraTab onOpenHistory={openHistory} />
        )}
        
        {activeTab === 'colaboradores' && (
          <ColaboradoresTab onOpenHistory={openHistory} />
        )}

        {activeTab === 'cargos' && (
          <div className="p-20 text-center text-gray-400">
            <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
            <p>Lista de cargos específicos por área</p>
          </div>
        )}
      </div>

      {/* 4. COMPONENTES EMERGENTES (MODALES Y PANELES) */}
      
      {/* Panel Lateral de Auditoría (Temporal Tables) */}
      {showHistory && (
        <AuditoriaPanel 
          onClose={() => setShowHistory(false)} 
          entity={selectedEntity} 
        />
      )}

      {/* Modal Dinámico de Creación */}
      <ModalCrearEntidad 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        entityType={modalType} 
      />

    </div>
  );
}