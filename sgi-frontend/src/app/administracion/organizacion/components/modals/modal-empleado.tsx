'use client';

import React, { useEffect, useState } from 'react';
import { Save, User, IdCard, MapPin, Briefcase, Calendar, Phone, Mail, Building2, Users, Loader2, AlertCircle } from 'lucide-react';
import { useEmpleados, useEmpleadosParaSelect } from '@/hooks/organizacion/useEmpleado';
import { useDepartamentosParaSelect } from '@/hooks/organizacion/useDepartamento';
import { useAreasByDepartamento } from '@/hooks/organizacion/useArea';
import { useCargosByArea } from '@/hooks/organizacion/useCargo';
import { useDepartamentosGeo, useProvincias, useDistritos } from '@/hooks/core/useUbigeo';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from '@/types/organizacion/empleado';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
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

interface FormErrors {
  nombres?: string;
  apellido_paterno?: string;
  nro_documento?: string;
  departamento_geo_id?: string;
  provincia_id?: string;
  distrito_id?: string;
  fecha_ingreso?: string;
  departamento_id?: string;
  area_id?: string;
  cargo_id?: string;
  email_personal?: string;
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

// ============================================
// COMPONENTE DE INPUT CON ERROR
// ============================================
interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  icon?: React.ReactNode;
}

function InputField({ label, name, value, onChange, error, required, disabled, type = 'text', placeholder, maxLength, icon }: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
        {icon}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-sm transition-colors ${error
          ? 'border-red-300 focus:ring-red-500 bg-red-50'
          : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
          }`}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE DE SELECT CON ERROR
// ============================================
interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { id: number; nombre?: string; nombre_completo?: string }[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

function SelectField({ label, name, value, onChange, options, error, required, disabled, placeholder = 'Seleccionar...' }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg border bg-white outline-none focus:ring-2 text-sm transition-colors ${error
          ? 'border-red-300 focus:ring-red-500 bg-red-50'
          : 'border-gray-200 focus:ring-blue-500'
          } ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options?.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.nombre || opt.nombre_completo}</option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE INTERNO DEL FORMULARIO
// ============================================
function ModalEmpleadoContent({ empleadoData, isOpen }: { empleadoData?: Empleado | null; isOpen: boolean }) {
  const { handleClose } = useModalContext();
  const isEdit = !!empleadoData;
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

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

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

  // Validar un solo campo
  const validateField = (name: string, value: string | number | null): string | undefined => {
    switch (name) {
      case 'nombres':
        if (!value || (typeof value === 'string' && !value.trim())) return 'El nombre es obligatorio';
        break;
      case 'apellido_paterno':
        if (!value || (typeof value === 'string' && !value.trim())) return 'El apellido paterno es obligatorio';
        break;
      case 'nro_documento':
        if (!value || (typeof value === 'string' && !value.trim())) return 'El número de documento es obligatorio';
        if (formData.tipo_documento === 'DNI' && typeof value === 'string' && value.length !== 8) return 'El DNI debe tener 8 dígitos';
        break;
      case 'email_personal':
        if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
        break;
      case 'departamento_geo_id':
        if (!value) return 'Seleccione un departamento';
        break;
      case 'provincia_id':
        if (!value && formData.departamento_geo_id) return 'Seleccione una provincia';
        break;
      case 'distrito_id':
        if (!value && formData.provincia_id) return 'Seleccione un distrito';
        break;
      case 'fecha_ingreso':
        if (!value) return 'La fecha de ingreso es obligatoria';
        if (typeof value === 'string' && new Date(value) > new Date()) return 'La fecha no puede ser futura';
        break;
      case 'departamento_id':
        if (!value) return 'Seleccione un departamento organizacional';
        break;
      case 'area_id':
        if (!value && formData.departamento_id) return 'Seleccione un área';
        break;
      case 'cargo_id':
        if (!value && formData.area_id) return 'Seleccione un cargo';
        break;
    }
    return undefined;
  };

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Campos obligatorios
    const requiredFields = [
      'nombres', 'apellido_paterno', 'nro_documento',
      'departamento_geo_id', 'provincia_id', 'distrito_id',
      'fecha_ingreso', 'departamento_id', 'area_id', 'cargo_id'
    ];

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof FormState]);
      if (error) newErrors[field as keyof FormErrors] = error;
    });

    // Validar email si tiene valor
    if (formData.email_personal) {
      const emailError = validateField('email_personal', formData.email_personal);
      if (emailError) newErrors.email_personal = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        departamento_geo_id: null,
        provincia_id: null,
        distrito_id: empleadoData.distrito_id || null,
        direccion: empleadoData.direccion || '',
        fecha_ingreso: empleadoData.fecha_ingreso || '',
        departamento_id: empleadoData.departamento_id || null,
        area_id: empleadoData.area_id || null,
        cargo_id: empleadoData.cargo_id || null,
        jefe_id: empleadoData.jefe_id || null,
      });
      setErrors({});
      setTouched(new Set());
    } else {
      setFormData(initialFormState);
      setErrors({});
      setTouched(new Set());
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
    const newValue = value === '' ? null : (
      ['departamento_geo_id', 'provincia_id', 'distrito_id', 'departamento_id', 'area_id', 'cargo_id', 'jefe_id'].includes(name)
        ? parseInt(value)
        : value
    );

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setTouched(prev => new Set(prev).add(name));

    // Validar el campo al cambiar si ya fue tocado
    if (touched.has(name)) {
      const error = validateField(name, newValue);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[name as keyof FormErrors] = error;
        } else {
          delete newErrors[name as keyof FormErrors];
        }
        return newErrors;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => new Set(prev).add(name));

    const newValue = value === '' ? null : (
      ['departamento_geo_id', 'provincia_id', 'distrito_id', 'departamento_id', 'area_id', 'cargo_id', 'jefe_id'].includes(name)
        ? parseInt(value)
        : value
    );

    const error = validateField(name, newValue);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name as keyof FormErrors] = error;
      } else {
        delete newErrors[name as keyof FormErrors];
      }
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todo antes de enviar
    if (!validateForm()) {
      toast.error('Por favor corrija los errores en el formulario');
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
      handleClose();
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Error al guardar empleado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <ModalHeader
        icon={isEdit ? <Briefcase size={20} className="text-amber-600" /> : <User size={20} className="text-blue-600" />}
        title={isEdit ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
      />

      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">

        {/* Banner de errores */}
        {hasErrors && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Por favor corrija los siguientes errores:</p>
              <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* SECCIÓN 1: DATOS PERSONALES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <IdCard size={16} className="text-blue-600" />
            <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Datos Personales</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Nombres"
              name="nombres"
              value={formData.nombres}
              onChange={handleChange}
              error={touched.has('nombres') ? errors.nombres : undefined}
              required
              disabled={isLoading}
              placeholder="Ingrese nombres"
            />
            <InputField
              label="Apellido Paterno"
              name="apellido_paterno"
              value={formData.apellido_paterno}
              onChange={handleChange}
              error={touched.has('apellido_paterno') ? errors.apellido_paterno : undefined}
              required
              disabled={isLoading}
            />
            <InputField
              label="Apellido Materno"
              name="apellido_materno"
              value={formData.apellido_materno}
              onChange={handleChange}
              disabled={isLoading}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Tipo Documento</label>
              <select
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné de Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <InputField
              label="Nro. Documento"
              name="nro_documento"
              value={formData.nro_documento}
              onChange={handleChange}
              error={touched.has('nro_documento') ? errors.nro_documento : undefined}
              required
              disabled={isLoading}
              maxLength={20}
            />
            <InputField
              label="Fecha Nacimiento"
              name="fecha_nacimiento"
              type="date"
              value={formData.fecha_nacimiento}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </section>

        {/* SECCIÓN 2: CONTACTO */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Phone size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Contacto y Ubicación</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Celular"
              name="celular"
              type="tel"
              value={formData.celular}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="999 999 999"
              icon={<Phone size={12} />}
            />
            <InputField
              label="Email Personal"
              name="email_personal"
              type="email"
              value={formData.email_personal}
              onChange={handleChange}
              error={touched.has('email_personal') ? errors.email_personal : undefined}
              disabled={isLoading}
              placeholder="correo@ejemplo.com"
              icon={<Mail size={12} />}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Departamento"
              name="departamento_geo_id"
              value={formData.departamento_geo_id}
              onChange={handleChange}
              options={departamentosGeo || []}
              error={touched.has('departamento_geo_id') ? errors.departamento_geo_id : undefined}
              required
              disabled={isLoading}
            />
            <SelectField
              label="Provincia"
              name="provincia_id"
              value={formData.provincia_id}
              onChange={handleChange}
              options={provincias || []}
              error={touched.has('provincia_id') ? errors.provincia_id : undefined}
              required
              disabled={!formData.departamento_geo_id || isLoading}
            />
            <SelectField
              label="Distrito"
              name="distrito_id"
              value={formData.distrito_id}
              onChange={handleChange}
              options={distritos || []}
              error={touched.has('distrito_id') ? errors.distrito_id : undefined}
              required
              disabled={!formData.provincia_id || isLoading}
            />
          </div>
          <InputField
            label="Dirección"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Av. / Jr. / Calle..."
            icon={<MapPin size={12} />}
          />
        </section>

        {/* SECCIÓN 3: INFORMACIÓN LABORAL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Información Laboral</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Departamento Org."
              name="departamento_id"
              value={formData.departamento_id}
              onChange={handleChange}
              options={departamentosOrg || []}
              error={touched.has('departamento_id') ? errors.departamento_id : undefined}
              required
              disabled={isLoading}
            />
            <SelectField
              label="Área"
              name="area_id"
              value={formData.area_id}
              onChange={handleChange}
              options={areasDelDepto || []}
              error={touched.has('area_id') ? errors.area_id : undefined}
              required
              disabled={!formData.departamento_id || isLoading}
            />
            <SelectField
              label="Cargo"
              name="cargo_id"
              value={formData.cargo_id}
              onChange={handleChange}
              options={cargosDelArea || []}
              error={touched.has('cargo_id') ? errors.cargo_id : undefined}
              required
              disabled={!formData.area_id || isLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Fecha Ingreso"
              name="fecha_ingreso"
              type="date"
              value={formData.fecha_ingreso}
              onChange={handleChange}
              error={touched.has('fecha_ingreso') ? errors.fecha_ingreso : undefined}
              required
              disabled={isLoading}
              icon={<Calendar size={12} />}
            />
            <SelectField
              label="Jefe Directo"
              name="jefe_id"
              value={formData.jefe_id}
              onChange={handleChange}
              options={(empleadosDropdown || []).filter(emp => {
                // Filtrar empleados de la misma área o del mismo departamento
                // Solo mostrar jefes potenciales después de seleccionar área
                return formData.area_id ? true : false;
              })}
              disabled={!formData.area_id || isLoading}
              placeholder={formData.area_id ? 'Sin jefe asignado' : 'Seleccione área primero'}
            />
          </div>
        </section>
      </form>

      <ModalFooter>
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="cursor-pointer flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold hover:bg-white hover:border-gray-400 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`cursor-pointer flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${isEdit ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
        >
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEdit ? 'Guardar Cambios' : 'Registrar'}</>}
        </button>
      </ModalFooter>
    </>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ModalGestionarEmpleado({ isOpen, onClose, empleadoData }: ModalProps) {
  return (
    <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <ModalEmpleadoContent empleadoData={empleadoData} isOpen={isOpen} />
    </ModalBase>
  );
}