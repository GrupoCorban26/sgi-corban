'use client';

import React, { useState } from 'react';
import { X, Save, LayoutGrid, GitGraph, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'departamento' | 'area' | 'cargo';
}

export default function ModalCrearEntidad({ isOpen, onClose, entityType }: ModalProps) {

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const config = {
    departamento: {
      title: 'Nuevo Departamento',
      icon: <LayoutGrid size={20} className="text-indigo-600" />,
      parentLabel: null,
    },
    area: {
      title: 'Nueva Área',
      icon: <GitGraph size={20} className="text-blue-600" />,
      parentLabel: 'Departamento', // Etiqueta más corta
    },
    cargo: {
      title: 'Nuevo Cargo',
      icon: <Briefcase size={20} className="text-purple-600" />,
      parentLabel: 'Área',
    }
  };

  const current = config[entityType];

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Overlay con desenfoque */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Contenedor Principal con Max-Height */}
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* CABECERA (Fija) */}
        <div className="flex items-center justify-between p-5 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              {current.icon}
            </div>
            <h2 className="text-lg font-bold text-gray-800">{current.title}</h2>
          </div>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO (Con Scroll si es necesario) */}
        <form className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          
          {/* Fila superior: Grid de 1 o 2 columnas según el tipo */}
          <div className={`grid gap-4 ${current.parentLabel ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
              <input 
                type="text" 
                placeholder="Ej. Comercial"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
              />
            </div>

            {current.parentLabel && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{current.parentLabel}</label>
                <select className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="">Seleccionar...</option>
                  {entityType === 'area' ? (
                    <option value="1">Comercial</option>
                  ) : (
                    <>
                      <option value="1">Pricing</option>
                      <option value="2">Ventas</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Selector de Responsable */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Responsable / Jefe</label>
            <select className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none bg-white text-sm">
              <option value="">Seleccionar colaborador...</option>
              <option value="1">Maricielo Silva</option>
            </select>
          </div>

          {/* Descripción (Reducida) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
            <textarea 
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none resize-none text-sm"
              placeholder="Notas breves..."
            />
          </div>
        </form>

        {/* PIE DE PÁGINA (Fijo) */}
        <div className="p-5 border-t bg-gray-50/50 flex gap-3 shrink-0">
          <button onClick={onClose} type="button" className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white transition-all cursor-pointer">
            Cancelar
          </button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all cursor-pointer">
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}