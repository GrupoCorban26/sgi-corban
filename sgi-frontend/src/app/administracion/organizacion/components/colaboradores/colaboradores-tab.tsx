'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  History,
  Edit2,
  Power,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import api from '@/lib/axios';
import { useEmpleados } from '@/hooks/organizacion/useEmpleado';
import { Empleado } from '@/types/organizacion/empleado';
import { toast } from 'sonner';

interface ColaboradoresTabProps {
  onOpenHistory: (entity: Empleado) => void;
  onEdit: (empleado: Empleado) => void;
  onNew: () => void;
  onToggleStatus: (empleado: Empleado) => void;
}

export function ColaboradoresTab({ onOpenHistory, onEdit, onNew, onToggleStatus }: ColaboradoresTabProps) {
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 15;

  // Hook para obtener empleados reales de la API
  const {
    empleados,
    isLoading,
    isError,
    totalPages,
    totalRegistros,
    isFetching
  } = useEmpleados(busqueda, null, null, page, pageSize);

  // Manejar búsqueda con debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    setPage(1); // Resetear a página 1 al buscar
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await api.post('/empleados/exportar', {}, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;

      // El nombre del archivo viene en los headers o generamos uno
      const contentDisposition = response.headers['content-disposition'];
      let filename = `empleados_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Exportación completada');
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar empleados');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* 1. Barra de Herramientas Local */}
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o código..."
            value={busqueda}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-green-200 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar Excel
          </button>

          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-gray-600">
            <Filter size={16} /> Filtros
          </button>

          <button
            onClick={onNew}
            className="cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <UserPlus size={16} /> Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* 2. Tabla de Colaboradores */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 size={40} className="animate-spin mb-3" />
            <p className="text-sm">Cargando colaboradores...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-400">
            <AlertCircle size={40} className="mb-3" />
            <p className="text-sm">Error al cargar colaboradores</p>
          </div>
        ) : empleados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Users size={40} className="mb-3" />
            <p className="text-sm font-medium">No hay colaboradores</p>
            <p className="text-xs">Agrega tu primer colaborador haciendo clic en &quot;Nuevo Colaborador&quot;</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Colaborador</th>
                <th className="px-6 py-4 font-semibold">Área / Cargo</th>
                <th className="px-6 py-4 font-semibold">Departamento</th>
                <th className="px-6 py-4 font-semibold">Empresa</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp: Empleado) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-600 font-bold border border-white shadow-sm">
                        {emp.nombres[0]}{emp.apellido_paterno[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {emp.nombres} {emp.apellido_paterno} {emp.apellido_materno || ''}
                        </div>
                        <div className="text-xs text-gray-500">{emp.nro_documento}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-medium">{emp.area_nombre || 'Sin área'}</div>
                    <div className="text-xs text-gray-500">{emp.cargo_nombre || 'Sin cargo'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{emp.departamento_nombre || 'Sin departamento'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-medium">{emp.empresa || 'Corban Trans Logistic'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                      {/* BOTÓN EDITAR */}
                      <button
                        onClick={() => onEdit(emp)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Editar ficha"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* BOTÓN HISTORIAL */}
                      <button
                        onClick={() => onOpenHistory(emp)}
                        className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                        title="Ver historial (Auditoría)"
                      >
                        <History size={16} />
                      </button>

                      {/* BOTÓN DESACTIVAR/ACTIVAR */}
                      <button
                        onClick={() => onToggleStatus(emp)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${emp.is_active
                          ? 'hover:bg-amber-100 text-amber-600'
                          : 'hover:bg-green-100 text-green-600'
                          }`}
                        title={emp.is_active ? 'Desactivar colaborador' : 'Reactivar colaborador'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Paginación */}
      {!isLoading && empleados.length > 0 && (
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {empleados.length} de {totalRegistros} colaboradores
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 px-3">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}