'use client';

import React, { useState } from 'react';
import { Users, Plus, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

// Componentes compartidos
import { TabButton } from '@/components/ui/TabButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Componentes organizados por carpeta
import { EstructuraTab } from './components/estructura/estructura-tab';
import { ColaboradoresTab } from './components/colaboradores/colaboradores-tab';
import { AuditoriaPanel } from './components/auditoria/auditoria-panel';
import ModalEntidad from './components/modals/modal-entidad';
import ModalGestionarEmpleado from './components/modals/modal-empleado';

// Hooks y tipos
import { useDepartamentos } from '@/hooks/organizacion/useDepartamento';
import { useAreas } from '@/hooks/organizacion/useArea';
import { useCargos } from '@/hooks/organizacion/useCargo';
import { useEmpleados } from '@/hooks/organizacion/useEmpleado';
import { Departamento } from '@/types/organizacion/departamento';
import { Area } from '@/types/organizacion/area';
import { Cargo } from '@/types/organizacion/cargo';
import { Empleado } from '@/types/organizacion/empleado';

export default function OrganizacionPage() {
  const [activeTab, setActiveTab] = useState('estructura');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Empleado | null>(null);

  // Modal Entidades
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'departamento' | 'area' | 'cargo'>('departamento');
  const [departamentoToEdit, setDepartamentoToEdit] = useState<Departamento | null>(null);
  const [areaToEdit, setAreaToEdit] = useState<Area | null>(null);
  const [cargoToEdit, setCargoToEdit] = useState<Cargo | null>(null);
  const [parentDepartamentoId, setParentDepartamentoId] = useState<number | null>(null);
  const [parentAreaId, setParentAreaId] = useState<number | null>(null);

  // Modal Empleados
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<{ type: 'departamento' | 'area' | 'cargo' | 'empleado'; data: Departamento | Area | Cargo | Empleado } | null>(null);

  // Mutations
  const { deleteMutation: deleteDeptoMutation } = useDepartamentos();
  const { deleteMutation: deleteAreaMutation } = useAreas();
  const { deleteMutation: deleteCargoMutation } = useCargos();
  const { deleteMutation: deleteEmpleadoMutation, reactivateMutation: reactivateEmpleadoMutation } = useEmpleados();

  // --- Handlers Crear ---
  const handleOpenCreate = (type: 'departamento' | 'area' | 'cargo', parentDepto?: number, parentArea?: number) => {
    setModalType(type);
    setDepartamentoToEdit(null);
    setAreaToEdit(null);
    setCargoToEdit(null);
    setParentDepartamentoId(parentDepto ?? null);
    setParentAreaId(parentArea ?? null);
    setIsEntityModalOpen(true);
  };

  // --- Handlers Editar ---
  const handleEditDepartamento = (depto: Departamento) => {
    setModalType('departamento');
    setDepartamentoToEdit(depto);
    setAreaToEdit(null);
    setCargoToEdit(null);
    setIsEntityModalOpen(true);
  };

  const handleEditArea = (area: Area) => {
    setModalType('area');
    setDepartamentoToEdit(null);
    setAreaToEdit(area);
    setCargoToEdit(null);
    setParentDepartamentoId(area.departamento_id);
    setIsEntityModalOpen(true);
  };

  const handleEditCargo = (cargo: Cargo) => {
    setModalType('cargo');
    setDepartamentoToEdit(null);
    setAreaToEdit(null);
    setCargoToEdit(cargo);
    setParentAreaId(cargo.area_id);
    setIsEntityModalOpen(true);
  };

  // --- Handlers Eliminar / Desactivar ---
  const handleDelete = (type: 'departamento' | 'area' | 'cargo', data: Departamento | Area | Cargo) => {
    setEntityToDelete({ type, data });
    setIsConfirmModalOpen(true);
  };

  const handleToggleStatus = (empleado: Empleado) => {
    setEntityToDelete({ type: 'empleado', data: empleado });
    setIsConfirmModalOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!entityToDelete) return;
    try {
      const { type, data } = entityToDelete;

      if (type === 'departamento') {
        await deleteDeptoMutation.mutateAsync((data as Departamento).id);
        toast.success('Departamento desactivado');
      }
      else if (type === 'area') {
        await deleteAreaMutation.mutateAsync((data as Area).id);
        toast.success('Área desactivada');
      }
      else if (type === 'cargo') {
        await deleteCargoMutation.mutateAsync((data as Cargo).id);
        toast.success('Cargo desactivado');
      }
      else if (type === 'empleado') {
        const emp = data as Empleado;
        if (emp.is_active) {
          await deleteEmpleadoMutation.mutateAsync(emp.id);
          toast.success('Colaborador desactivado');
        } else {
          await reactivateEmpleadoMutation.mutateAsync(emp.id);
          toast.success('Colaborador reactivado');
        }
      }

      setIsConfirmModalOpen(false);
      setEntityToDelete(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al procesar la solicitud');
    }
  };

  const handleCloseEntityModal = () => {
    setIsEntityModalOpen(false);
    setDepartamentoToEdit(null);
    setAreaToEdit(null);
    setCargoToEdit(null);
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
            onOpenHistory={(e) => { setSelectedEntity(e); setShowHistory(true); }}
            onEdit={(e) => { setSelectedEmpleado(e); setIsEmpModalOpen(true); }}
            onNew={() => { setSelectedEmpleado(null); setIsEmpModalOpen(true); }}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      {/* Modales */}
      <ModalEntidad
        isOpen={isEntityModalOpen}
        onClose={handleCloseEntityModal}
        entityType={modalType}
        departamentoToEdit={departamentoToEdit}
        areaToEdit={areaToEdit}
        cargoToEdit={cargoToEdit}
        parentDepartamentoId={parentDepartamentoId}
        parentAreaId={parentAreaId}
      />

      <ModalGestionarEmpleado isOpen={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} empleadoData={selectedEmpleado} />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setEntityToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title={entityToDelete?.type === 'empleado'
          ? ((entityToDelete.data as Empleado).is_active ? '¿Desactivar Colaborador?' : '¿Reactivar Colaborador?')
          : `¿Desactivar ${entityToDelete?.type}?`}
        message={entityToDelete?.type === 'empleado'
          ? `Estás a punto de ${(entityToDelete.data as Empleado).is_active ? 'desactivar' : 'reactivar'} a "${(entityToDelete.data as Empleado).nombres}".`
          : `Estás a punto de desactivar "${(entityToDelete?.data as { nombre?: string })?.nombre}". Esta acción se puede revertir.`}
        confirmText={entityToDelete?.type === 'empleado'
          ? ((entityToDelete.data as Empleado).is_active ? 'Desactivar' : 'Reactivar')
          : "Desactivar"}
        isLoading={deleteDeptoMutation.isPending || deleteAreaMutation.isPending || deleteCargoMutation.isPending || deleteEmpleadoMutation.isPending || reactivateEmpleadoMutation.isPending}
        variant={entityToDelete?.type === 'empleado' && !(entityToDelete.data as Empleado).is_active ? 'warning' : 'danger'}
      />

      {showHistory && <AuditoriaPanel onClose={() => setShowHistory(false)} entity={selectedEntity} />}
    </div>
  );
}