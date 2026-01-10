'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, User, IdCard, MapPin, Briefcase, Calendar, Phone, Mail, Building2, Users } from 'lucide-react';
import { useEmpleados, useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { useDepartamentos, useDepartamentosParaSelect } from '@/hooks/organizacion/useDepartamento';
import { useAreasParaSelect, useAreasByDepartamento } from '@/hooks/organizacion/useArea';
import { useCargosParaSelect, useCargosByArea } from '@/hooks/organizacion/useCargo';
import { useDepartamentosGeo, useProvincias, useDistritos } from '@/hooks/core/useUbigeo';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from '@/types/organizacion/empleado';
import { toast } from 'sonner';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleadoData?: Empleado | null;
}

interface FormState {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  tipo_documento: string;
  nro_documento: string;
  celular: string;
  email_personal: string;
  departamento_geo_id: number | null;
  provincia_id: number | null;
  distrito_id: number | null;
  direccion: string;
  fecha_ingreso: string;
  departamento_id: number | null;
  area_id: number | null;
  cargo_id: number | null;
  jefe_id: number | null;
}

const initialFormState: FormState = {
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  tipo_documento: 'DNI',
  nro_documento: '',
  celular: '',
  email_personal: '',
  departamento_geo_id: null,
  provincia_id: null,
  distrito_id: null,
  direccion: '',
  fecha_ingreso: '',
  departamento_id: null,
  area_id: null,
  cargo_id: null,
  jefe_id: null,
};

export default function ModalGestionarEmpleado({ isOpen, onClose, empleadoData }: ModalProps) {
  const isEdit = !!empleadoData;
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks de empleados
  const { createMutation, updateMutation } = useEmpleados();
  const { data: empleadosDropdown } = useEmpleadosParaSelect();

  // Hooks de organización
  const { data: departamentosOrg } = useDepartamentosParaSelect();
  const { data: areasDelDepto } = useAreasByDepartamento(formData.departamento_id);
  const { data: cargosDelArea } = useCargosByArea(formData.area_id);

  // Hooks de ubigeo (cascada)
  const { data: departamentosGeo } = useDepartamentosGeo();
  const { data: provincias } = useProvincias(formData.departamento_geo_id);
  const { data: distritos } = useDistritos(formData.provincia_id);

  // Cargar datos al editar
  useEffect(() => {
    if (isEdit && empleadoData) {
      setFormData({
        nombres: empleadoData.nombres || '',
        apellido_paterno: empleadoData.apellido_paterno || '',
        apellido_materno: empleadoData.apellido_materno || '',
        fecha_nacimiento: empleadoData.fecha_nacimiento || '',
        tipo_documento: empleadoData.tipo_documento || 'DNI',
        nro_documento: empleadoData.nro_documento || '',
        celular: empleadoData.celular || '',
        email_personal: empleadoData.email_personal || '',
        departamento_geo_id: null, // Se debe cargar desde el distrito
        provincia_id: null,
        distrito_id: empleadoData.distrito_id || null,
        direccion: empleadoData.direccion || '',
        fecha_ingreso: empleadoData.fecha_ingreso || '',
        departamento_id: empleadoData.departamento_id || null,
        area_id: empleadoData.area_id || null,
        cargo_id: empleadoData.cargo_id || null,
        jefe_id: empleadoData.jefe_id || null,
      });
    } else {
      setFormData(initialFormState);
    }
  }, [isEdit, empleadoData, isOpen]);

  // Resetear selects dependientes cuando cambia el padre
  useEffect(() => {
    if (!isEdit) {
      setFormData(prev => ({ ...prev, provincia_id: null, distrito_id: null }));
    }
  }, [formData.departamento_geo_id]);

  useEffect(() => {
    if (!isEdit) {
      setFormData(prev => ({ ...prev, distrito_id: null }));
    }
  }, [formData.provincia_id]);

  useEffect(() => {
    if (!isEdit) {
      setFormData(prev => ({ ...prev, area_id: null, cargo_id: null }));
    }
  }, [formData.departamento_id]);

  useEffect(() => {
    if (!isEdit) {
      setFormData(prev => ({ ...prev, cargo_id: null }));
    }
  }, [formData.area_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : (
        ['departamento_geo_id', 'provincia_id', 'distrito_id', 'departamento_id', 'area_id', 'cargo_id', 'jefe_id'].includes(name)
          ? parseInt(value)
          : value
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombres || !formData.apellido_paterno || !formData.nro_documento) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }
    if (!formData.distrito_id || !formData.fecha_ingreso) {
      toast.error('Debe seleccionar distrito y fecha de ingreso');
      return;
    }
    if (!formData.departamento_id || !formData.area_id || !formData.cargo_id) {
      toast.error('Debe seleccionar departamento, área y cargo');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && empleadoData) {
        const updateData: EmpleadoUpdate = {
          nombres: formData.nombres,
          apellido_paterno: formData.apellido_paterno,
          apellido_materno: formData.apellido_materno || undefined,
          fecha_nacimiento: formData.fecha_nacimiento || undefined,
          tipo_documento: formData.tipo_documento,
          nro_documento: formData.nro_documento,
          celular: formData.celular || undefined,
          email_personal: formData.email_personal || undefined,
          distrito_id: formData.distrito_id!,
          direccion: formData.direccion || undefined,
          fecha_ingreso: formData.fecha_ingreso,
          departamento_id: formData.departamento_id!,
          area_id: formData.area_id!,
          cargo_id: formData.cargo_id!,
          jefe_id: formData.jefe_id,
        };
        await updateMutation.mutateAsync({ id: empleadoData.id, data: updateData });
        toast.success('Empleado actualizado correctamente');
      } else {
        const createData: EmpleadoCreate = {
          nombres: formData.nombres,
          apellido_paterno: formData.apellido_paterno,
          apellido_materno: formData.apellido_materno || undefined,
          fecha_nacimiento: formData.fecha_nacimiento || undefined,
          tipo_documento: formData.tipo_documento,
          nro_documento: formData.nro_documento,
          celular: formData.celular || undefined,
          email_personal: formData.email_personal || undefined,
          distrito_id: formData.distrito_id!,
          direccion: formData.direccion || undefined,
          fecha_ingreso: formData.fecha_ingreso,
          departamento_id: formData.departamento_id!,
          area_id: formData.area_id!,
          cargo_id: formData.cargo_id!,
          jefe_id: formData.jefe_id,
        };
        await createMutation.mutateAsync(createData);
        toast.success('Empleado registrado correctamente');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar empleado');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isEdit ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-lg ${isEdit ? 'bg-amber-600' : 'bg-blue-600'}`}>
              {isEdit ? <Briefcase size={22} /> : <User size={22} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? `Modificando: ${empleadoData?.nombres} ${empleadoData?.apellido_paterno}` : 'Complete los datos del colaborador'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* SECCIÓN 1: DATOS PERSONALES */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <IdCard size={16} className="text-blue-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Datos Personales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nombres *</label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Ingrese nombres"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Apellido Paterno *</label>
                <input
                  type="text"
                  name="apellido_paterno"
                  value={formData.apellido_paterno}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Apellido Materno</label>
                <input
                  type="text"
                  name="apellido_materno"
                  value={formData.apellido_materno}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Tipo Documento</label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nro. Documento *</label>
                <input
                  type="text"
                  name="nro_documento"
                  value={formData.nro_documento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fecha Nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: CONTACTO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Phone size={16} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Contacto y Ubicación</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Phone size={12} /> Celular</label>
                <input
                  type="tel"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="999 999 999"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Mail size={12} /> Email Personal</label>
                <input
                  type="email"
                  name="email_personal"
                  value={formData.email_personal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Departamento *</label>
                <select
                  name="departamento_geo_id"
                  value={formData.departamento_geo_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {departamentosGeo?.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Provincia *</label>
                <select
                  name="provincia_id"
                  value={formData.provincia_id || ''}
                  onChange={handleChange}
                  disabled={!formData.departamento_geo_id}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Seleccionar...</option>
                  {provincias?.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Distrito *</label>
                <select
                  name="distrito_id"
                  value={formData.distrito_id || ''}
                  onChange={handleChange}
                  disabled={!formData.provincia_id}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Seleccionar...</option>
                  {distritos?.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><MapPin size={12} /> Dirección</label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Av. / Jr. / Calle..."
              />
            </div>
          </section>

          {/* SECCIÓN 3: INFORMACIÓN LABORAL */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 size={16} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-700 uppercase text-xs tracking-wider">Información Laboral</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Calendar size={12} /> Fecha Ingreso *</label>
                <input
                  type="date"
                  name="fecha_ingreso"
                  value={formData.fecha_ingreso}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Users size={12} /> Jefe Directo</label>
                <select
                  name="jefe_id"
                  value={formData.jefe_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Sin jefe asignado</option>
                  {empleadosDropdown?.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Departamento Org. *</label>
                <select
                  name="departamento_id"
                  value={formData.departamento_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {departamentosOrg?.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Área *</label>
                <select
                  name="area_id"
                  value={formData.area_id || ''}
                  onChange={handleChange}
                  disabled={!formData.departamento_id}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {areasDelDepto?.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Cargo *</label>
                <select
                  name="cargo_id"
                  value={formData.cargo_id || ''}
                  onChange={handleChange}
                  disabled={!formData.area_id}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {cargosDelArea?.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="p-5 border-t bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-2 text-white rounded-lg font-semibold shadow-lg flex items-center gap-2 transition-all text-sm disabled:opacity-50 ${isEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Registrar')}
          </button>
        </div>
      </div>
    </div>
  );
}