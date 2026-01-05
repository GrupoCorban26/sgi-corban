'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, User, IdCard, MapPin, Briefcase, Calendar, Phone, Mail } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleadoData?: any;
}

export default function ModalGestionarEmpleado({ isOpen, onClose, empleadoData }: ModalProps) {
  const isEdit = !!empleadoData;

  // Estado inicial del formulario basado en las columnas de tu SQL
  const [formData, setFormData] = useState({
    codigo_empleado: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    tipo_documento: 'DNI',
    nro_documento: '',
    celular: '',
    email_personal: '',
    direccion: '',
    fecha_ingreso: '',
    area_id: '',
    cargo_id: ''
  });

  // Efecto para cargar datos si es edición
  useEffect(() => {
    if (isEdit && empleadoData) {
      setFormData(empleadoData);
    } else {
      setFormData({
        codigo_empleado: '', nombres: '', apellido_paterno: '', apellido_materno: '',
        tipo_documento: 'DNI', nro_documento: '', celular: '', email_personal: '',
        direccion: '', fecha_ingreso: '', area_id: '', cargo_id: ''
      });
    }
  }, [isEdit, empleadoData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Cabecera dinámica */}
        <div className={`flex items-center justify-between p-6 border-b ${isEdit ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-lg ${isEdit ? 'bg-amber-600 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'}`}>
              {isEdit ? <Briefcase size={24} /> : <User size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isEdit ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? `Modificando registro: ${formData.codigo_empleado}` : 'Ingresa los datos para la ficha de Grupo Corban'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form className="p-8 overflow-y-auto space-y-8">
          {/* SECCIÓN 1: IDENTIDAD */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <IdCard size={18} className="text-blue-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Identidad y Datos Personales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Código Empleado</label>
                <input 
                  type="text" 
                  value={formData.codigo_empleado}
                  disabled={isEdit}
                  className={`w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} 
                  placeholder="CORB-XXX"
                />
              </div>
              <div className="md:col-span-2 invisible md:visible" />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nombres</label>
                <input type="text" value={formData.nombres} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Apellido Paterno</label>
                <input type="text" value={formData.apellido_paterno} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Apellido Materno</label>
                <input type="text" value={formData.apellido_materno} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo Documento</label>
                <select value={formData.tipo_documento} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white outline-none">
                  <option value="DNI">DNI</option>
                  <option value="CE">C.E.</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nro Documento</label>
                <input type="text" value={formData.nro_documento} disabled={isEdit} className={`w-full px-4 py-2 rounded-xl border border-slate-200 outline-none ${isEdit ? 'bg-slate-50 cursor-not-allowed' : ''}`} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Fecha Nacimiento</label>
                <input type="date" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: CONTACTO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Contacto y Residencia</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone size={12}/> Celular</label>
                <input type="tel" value={formData.celular} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Mail size={12}/> Email Personal</label>
                <input type="email" value={formData.email_personal} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone size={12}/> Departamento</label>
                <input type="tel" value={formData.celular} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone size={12}/> Provincia</label>
                <input type="tel" value={formData.celular} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone size={12}/> Distrito</label>
                <input type="tel" value={formData.celular} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Phone size={12}/> Dirección</label>
                <input type="tel" value={formData.celular} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: LABORAL */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Briefcase size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Información Laboral</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Calendar size={12}/> Fecha Ingreso</label>
                <input type="date" value={formData.fecha_ingreso} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Área</label>
                <select className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white outline-none">
                   <option>Seleccionar...</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Cargo</label>
                <select className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white outline-none">
                   <option>Seleccionar...</option>
                </select>
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="cursor-pointer px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-white transition-all">
            Cancelar
          </button>
          <button type="submit" className={`cursor-pointer px-8 py-2.5 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${isEdit ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}>
            <Save size={18} />
            {isEdit ? 'Guardar Cambios' : 'Registrar Colaborador'}
          </button>
        </div>
      </div>
    </div>
  );
}