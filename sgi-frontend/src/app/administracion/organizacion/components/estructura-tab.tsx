'use client';

import React, { useState } from 'react';
import { 
  Building2, User, ChevronLeft, ChevronRight, 
  RefreshCw, MoreVertical, History, Search, AlertCircle 
} from 'lucide-react';
import { useDepartamentos } from '@/hooks/organizacion/useDepartamento';

interface EstructuraTabProps {
  onOpenHistory: (entity: any) => void;
}

export function EstructuraTab({ onOpenHistory }: EstructuraTabProps) {
  // --- ESTADOS LOCALES (Solo para UI) ---
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // --- TANSTACK QUERY ---
  // El hook maneja automáticamente la carga, error y caché
  const { listQuery } = useDepartamentos(busqueda, page, pageSize);
  
  const { data: response, isLoading, isError, error, refetch, isFetching } = listQuery;

  // Atajos para los datos
  const departamentos = response?.data || [];
  const totalPages = response?.pages || 1;
  const totalRegistros = response?.total || 0;

  return (
    <div className="flex flex-col h-full min-h-125 bg-white">
      
      {/* 1. BARRA DE HERRAMIENTAS */}
      <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1); // Reiniciar a página 1 al buscar
            }}
            placeholder="Buscar por nombre..." 
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
          title="Refrescar datos"
        >
          <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. TABLA O ESTADOS */}
      <div className="grow overflow-x-auto">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle size={40} className="mb-2" />
            <p className="font-medium">{(error as any)?.response?.data?.detail || "Error al cargar"}</p>
            <button onClick={() => refetch()} className="mt-4 text-sm underline text-slate-600">Reintentar</button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b">
                <th className="px-6 py-4 font-semibold">Departamento</th>
                <th className="px-6 py-4 font-semibold">Responsable</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                // Skeleton Loader
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={3} className="px-6 py-6 bg-slate-50/30"></td>
                  </tr>
                ))
              ) : departamentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-slate-400 text-sm">
                    No se encontraron departamentos.
                  </td>
                </tr>
              ) : departamentos.map((depto) => (
                <tr key={depto.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{depto.nombre}</div>
                        <div className="text-[11px] text-slate-400 font-medium">ID: {depto.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-white shadow-sm">
                        <User size={14} />
                      </div>
                      <span className="text-sm text-slate-700 font-semibold">
                        {/* Asegúrate de que este campo venga de tu SP/Backend */}
                        {depto.responsable_name ? depto.responsable_name : 'Sin asignar'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onOpenHistory(depto)}
                        className="p-2 hover:bg-white hover:shadow-md text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                      >
                        <History size={17} />
                      </button>
                      <button className="p-2 hover:bg-white hover:shadow-md text-slate-400 rounded-lg transition-all">
                        <MoreVertical size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. PAGINACIÓN */}
      <div className="p-4 border-t flex items-center justify-between bg-slate-50/50">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
          Total Registros: <span className="text-slate-900 font-bold">{totalRegistros}</span>
        </p>
        
        <div className="flex items-center gap-3">
          <button 
            disabled={page === 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-100">
              {page}
            </span>
            <span className="text-xs text-slate-400 font-medium px-1">de {totalPages}</span>
          </div>

          <button 
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-all"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}