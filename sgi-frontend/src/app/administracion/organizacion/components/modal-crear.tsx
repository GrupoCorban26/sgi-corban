'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, LayoutGrid, GitGraph, Briefcase, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'departamento' | 'area' | 'cargo';
}

export default function ModalCrearEntidad({ isOpen, onClose, entityType }: ModalProps) {
  if (!isOpen) return null;

  // Configuración dinámica por tipo de entidad
  const config = {
    departamento: {
      title: 'Nuevo Departamento',
      icon: <LayoutGrid size={20} className="text-indigo-600" />,
      parentLabel: null, // El departamento es el nivel raíz
    },
    area: {
      title: 'Nueva Área',
      icon: <GitGraph size={20} className="text-blue-600" />,
      parentLabel: 'Departamento al que pertenece',
    },
    cargo: {
      title: 'Nuevo Cargo',
      icon: <Briefcase size={20} className="text-purple-600" />,
      parentLabel: 'Área a la que pertenece',
    }
  };

  const current = config[entityType];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* CABECERA DINÁMICA */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
              {current.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{current.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={24} />
          </button>
        </div>

        <form className="p-6 space-y-5">
          {/* CAMPO COMÚN: NOMBRE */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Nombre del {entityType}</label>
            <input 
              type="text" 
              placeholder={`Ej. ${entityType === 'departamento' ? 'Comercial' : entityType === 'area' ? 'Pricing' : 'Analista Sr'}`}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* SELECTOR JERÁRQUICO (Solo si no es Departamento) */}
          {current.parentLabel && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">{current.parentLabel}</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione una opción...</option>
                {/* Aquí cargarías las opciones desde tu API */}
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

          {/* CAMPOS ADICIONALES (Responsable) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Responsable / Jefe</label>
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none bg-white appearance-none">
              <option value="">Seleccionar colaborador...</option>
              <option value="1">Maricielo Silva</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Descripción (Opcional)</label>
            <textarea 
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none resize-none"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-[11px] border border-amber-100">
            <Info size={14} />
            <span>Este registro se guardará en la tabla versionada para auditoría histórica.</span>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50/50 flex gap-3">
          <button onClick={onClose} type="button" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-white transition-all">
            Cancelar
          </button>
          <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all">
            <Save size={18} />
            Guardar {entityType}
          </button>
        </div>
      </div>
    </div>
  );
}