'use client';

import React, { useState } from 'react';
import { Users, Plus, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

// Componentes organizados por carpeta
import { TabButton } from './components/ui/tab-button';
import { EstructuraTab } from './components/estructura/estructura-tab';
import { ColaboradoresTab } from './components/colaboradores/colaboradores-tab';
import { AuditoriaPanel } from './components/auditoria/auditoria-panel';
import ModalEntidad from './components/modals/modal-entidad';
import ModalGestionarEmpleado from './components/modals/modal-empleado';
import ModalConfirmar from './components/modals/modal-confirmar';

// Hooks y tipos
import { useDepartamentos } from '@/hooks/organizacion/useDepartamento';
import { useAreas } from '@/hooks/organizacion/useArea';
import { useCargos } from '@/hooks/organizacion/useCargo';
import { Departamento } from '@/types/organizacion/departamento';
import { Area } from '@/types/organizacion/area';
import { Cargo } from '@/types/organizacion/cargo';

export default function OrganizacionPage() {
  const [activeTab, setActiveTab] = useState('estructura');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Modal Entidades
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'departamento' | 'area' | 'cargo'>('departamento');
  const [departamentoToEdit, setDepartamentoToEdit] = useState<Departamento | null>(null);
  const [parentDepartamentoId, setParentDepartamentoId] = useState<number | null>(null);
  const [parentAreaId, setParentAreaId] = useState<number | null>(null);

  // Modal Empleados
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);

  // Modal Confirmación
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<{ type: 'departamento' | 'area' | 'cargo'; data: Departamento | Area | Cargo } | null>(null);

  // Mutations
  const { deleteMutation: deleteDeptoMutation } = useDepartamentos();
  const { deleteMutation: deleteAreaMutation } = useAreas();
  const { deleteMutation: deleteCargoMutation } = useCargos();

  // --- Handlers Crear ---
  const handleOpenCreate = (type: 'departamento' | 'area' | 'cargo', parentDepto?: number, parentArea?: number) => {
    setModalType(type);
    setDepartamentoToEdit(null);
    setParentDepartamentoId(parentDepto ?? null);
    setParentAreaId(parentArea ?? null);
    setIsEntityModalOpen(true);
  };

  // --- Handlers Editar ---
  const handleEditDepartamento = (depto: Departamento) => {
    setModalType('departamento');
    setDepartamentoToEdit(depto);
    setIsEntityModalOpen(true);
  };

  const handleEditArea = (area: Area) => {
    setModalType('area');
    setDepartamentoToEdit(null);
    setParentDepartamentoId(area.departamento_id);
    setIsEntityModalOpen(true);
  };

  const handleEditCargo = (cargo: Cargo) => {
    setModalType('cargo');
    setDepartamentoToEdit(null);
    setParentAreaId(cargo.area_id);
    setIsEntityModalOpen(true);
  };

  // --- Handlers Eliminar ---
  const handleDelete = (type: 'departamento' | 'area' | 'cargo', data: Departamento | Area | Cargo) => {
    setEntityToDelete({ type, data });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entityToDelete) return;
    try {
      const { type, data } = entityToDelete;
      if (type === 'departamento') await deleteDeptoMutation.mutateAsync((data as Departamento).id);
      else if (type === 'area') await deleteAreaMutation.mutateAsync((data as Area).id);
      else if (type === 'cargo') await deleteCargoMutation.mutateAsync((data as Cargo).id);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} desactivado`);
      setIsConfirmModalOpen(false);
      setEntityToDelete(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al desactivar');
    }
  };

  const handleCloseEntityModal = () => {
    setIsEntityModalOpen(false);
    setDepartamentoToEdit(null);
    setParentDepartamentoId(null);
    setParentAreaId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión Organizacional</h1>
          <p className="text-sm text-gray-500">Configuración de estructura y personal</p>
        </div>
        <button
          onClick={() => handleOpenCreate('departamento')}
          className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200"
        >
          <Plus size={18} /> Nuevo Departamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200 w-fit">
        <TabButton active={activeTab === 'estructura'} onClick={() => setActiveTab('estructura')} icon={<LayoutGrid size={18} />} label="Estructura" />
        <TabButton active={activeTab === 'colaboradores'} onClick={() => setActiveTab('colaboradores')} icon={<Users size={18} />} label="Colaboradores" />
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-125 overflow-hidden">
        {activeTab === 'estructura' && (
          <EstructuraTab
            onEdit={handleEditDepartamento}
            onDelete={(d) => handleDelete('departamento', d)}
            onEditArea={handleEditArea}
            onDeleteArea={(a) => handleDelete('area', a)}
            onEditCargo={handleEditCargo}
            onDeleteCargo={(c) => handleDelete('cargo', c)}
            onCreateArea={(deptoId) => handleOpenCreate('area', deptoId)}
            onCreateCargo={(areaId) => handleOpenCreate('cargo', undefined, areaId)}
          />
        )}
        {activeTab === 'colaboradores' && (
          <ColaboradoresTab
            onOpenHistory={(e) => { setSelectedEntity(e as null); setShowHistory(true); }}
            onEdit={(e) => { setSelectedEmpleado(e as null); setIsEmpModalOpen(true); }}
            onNew={() => { setSelectedEmpleado(null); setIsEmpModalOpen(true); }}
          />
        )}
      </div>

      {/* Modales */}
      <ModalEntidad
        isOpen={isEntityModalOpen}
        onClose={handleCloseEntityModal}
        entityType={modalType}
        departamentoToEdit={departamentoToEdit}
        parentDepartamentoId={parentDepartamentoId}
        parentAreaId={parentAreaId}
      />

      <ModalGestionarEmpleado isOpen={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} empleadoData={selectedEmpleado} />

      <ModalConfirmar
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setEntityToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title={`¿Desactivar ${entityToDelete?.type}?`}
        message={`Estás a punto de desactivar "${(entityToDelete?.data as { nombre?: string })?.nombre}". Esta acción se puede revertir.`}
        confirmText="Desactivar"
        isLoading={deleteDeptoMutation.isPending || deleteAreaMutation.isPending || deleteCargoMutation.isPending}
        variant="danger"
      />

      {showHistory && <AuditoriaPanel onClose={() => setShowHistory(false)} entity={selectedEntity} />}
    </div>
  );
}