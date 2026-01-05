'use client';

import React, { useState } from 'react';
import { Users, Plus, LayoutGrid, Briefcase } from 'lucide-react';

// Componentes locales
import { TabButton } from './components/tab-button';
import { EstructuraTab } from './components/estructura-tab';
import { ColaboradoresTab } from './components/colaboradores-tab';
import { AuditoriaPanel } from './components/auditoria-panel';
import ModalCrearEntidad from './components/modal-crear';
import ModalGestionarEmpleado from './components/modal-gestionar-empleado';

export default function OrganizacionPage() {
  const [activeTab, setActiveTab] = useState('estructura');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // --- Lógica Modal Entidades (Depto/Area/Cargo) ---
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'departamento' | 'area' | 'cargo'>('departamento');

  // --- Lógica Modal Empleados ---
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);

  const handleOpenEntityModal = (type: 'departamento' | 'area' | 'cargo') => {
    setModalType(type);
    setIsEntityModalOpen(true);
  };

  const handleNewEmpleado = () => {
    setSelectedEmpleado(null);
    setIsEmpModalOpen(true);
  };

  const handleEditEmpleado = (empleado: any) => {
    setSelectedEmpleado(empleado);
    setIsEmpModalOpen(true);
  };

  const openHistory = (entity: any) => {
    setSelectedEntity(entity);
    setShowHistory(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      
      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión Organizacional</h1>
          <p className="text-sm text-gray-500">Configuración de estructura y personal - Grupo Corban</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleOpenEntityModal('departamento')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus size={16} /> <span>Depto.</span>
          </button>
          <button onClick={() => handleOpenEntityModal('area')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus size={16} /> <span>Área</span>
          </button>
          <button onClick={() => handleOpenEntityModal('cargo')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus size={16} /> <span>Cargo</span>
          </button>
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200 w-fit">
        <TabButton active={activeTab === 'estructura'} onClick={() => setActiveTab('estructura')} icon={<LayoutGrid size={18} />} label="Estructura" />
        <TabButton active={activeTab === 'colaboradores'} onClick={() => setActiveTab('colaboradores')} icon={<Users size={18} />} label="Colaboradores" />
      </div>

      {/* 3. CONTENIDO */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-125 overflow-hidden">
        {activeTab === 'estructura' && <EstructuraTab onOpenHistory={openHistory} />}
        {activeTab === 'colaboradores' && (
          <ColaboradoresTab 
            onOpenHistory={openHistory} 
            onEdit={handleEditEmpleado} 
            onNew={handleNewEmpleado} 
          />
        )}
      </div>

      {/* 4. MODALES */}
      <ModalCrearEntidad 
        isOpen={isEntityModalOpen} 
        onClose={() => setIsEntityModalOpen(false)} 
        entityType={modalType} 
      />

      <ModalGestionarEmpleado 
        isOpen={isEmpModalOpen} 
        onClose={() => setIsEmpModalOpen(false)} 
        empleadoData={selectedEmpleado} 
      />

      {showHistory && (
        <AuditoriaPanel onClose={() => setShowHistory(false)} entity={selectedEntity} />
      )}
    </div>
  );
}