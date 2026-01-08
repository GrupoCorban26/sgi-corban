'use client';

import React from 'react';
import { 
  UserPlus, 
  History, 
  Edit2, 
  MoreVertical, 
  Search,
  Filter
} from 'lucide-react';

interface ColaboradoresTabProps {
  onOpenHistory: (entity: any) => void;
  onEdit: (empleado: any) => void;
  onNew: () => void;
}

export function ColaboradoresTab({ onOpenHistory, onEdit, onNew }: ColaboradoresTabProps) {
  
  // Datos de prueba (Luego vendrán de tu API FastAPI)
  const empleadosDummy = [
    { id: 1, nombres: 'Juan', apellido_paterno: 'Pérez', codigo_empleado: 'CORB-001', area: 'Sistemas', cargo: 'Desarrollador' },
    { id: 2, nombres: 'Maria', apellido_paterno: 'Lopez', codigo_empleado: 'CORB-002', area: 'Comercial', cargo: 'Ejecutivo' },
  ];

  return (
    <div className="flex flex-col h-full">
      
      {/* 1. Barra de Herramientas Local */}
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, DNI o código..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-gray-600">
            <Filter size={16} /> Filtros
          </button>
          
          {/* AQUÍ USAMOS onNew */}
          <button 
            onClick={onNew}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <UserPlus size={16} /> Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* 2. Tabla de Colaboradores */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Colaborador</th>
              <th className="px-6 py-4 font-semibold">Área / Cargo</th>
              <th className="px-6 py-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {empleadosDummy.map((emp) => (
              <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold border border-white shadow-sm">
                      {emp.nombres[0]}{emp.apellido_paterno[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{emp.nombres} {emp.apellido_paterno}</div>
                      <div className="text-xs text-blue-600 font-medium">{emp.codigo_empleado}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700 font-medium">{emp.area}</div>
                  <div className="text-xs text-gray-500">{emp.cargo}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    
                    {/* BOTÓN EDITAR (onEdit) */}
                    <button 
                      onClick={() => onEdit(emp)}
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Editar ficha"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* BOTÓN HISTORIAL (onOpenHistory) */}
                    <button 
                      onClick={() => onOpenHistory(emp)}
                      className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                      title="Ver historial (Auditoría)"
                    >
                      <History size={16} />
                    </button>
                    
                    <button className="p-2 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}