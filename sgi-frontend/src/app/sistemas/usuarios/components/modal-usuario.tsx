'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUsuarios, useRoles, useEmpleadosSinUsuario } from '@/hooks/useUsuarios';
import { Usuario, UsuarioCreate, UsuarioUpdate } from '@/types/usuario';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// ============================================
// TIPOS
// ============================================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    usuarioToEdit?: Usuario | null;
}

interface ModalContentProps {
    usuarioToEdit: Usuario | null;
    isOpen: boolean;
}

interface FormErrors {
    empleado?: string;
    correo?: string;
    password?: string;
    roles?: string;
}

// ============================================
// COMPONENTE INTERNO (usa el contexto del modal)
// ============================================
function ModalContent({ usuarioToEdit, isOpen }: ModalContentProps) {
    const { handleClose } = useModalContext();
    const isEditMode = !!usuarioToEdit;

    // Hooks
    const { createMutation, updateMutation, changePasswordMutation } = useUsuarios();
    const { data: roles = [], isLoading: loadingRoles } = useRoles();
    const { data: empleadosDisponibles = [], isLoading: loadingEmpleados } = useEmpleadosSinUsuario();

    // Form state
    const [empleadoId, setEmpleadoId] = useState<number | ''>('');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
    const [debeCambiarPass, setDebeCambiarPass] = useState(false);
    const [isBloqueado, setIsBloqueado] = useState(false);
    const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);

    // Validation state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // Derivados
    const isLoading = createMutation.isPending || updateMutation.isPending || changePasswordMutation.isPending;
    const config = useMemo(() => ({
        title: isEditMode ? 'Editar Usuario' : 'Nuevo Usuario',
        icon: <User size={20} className="text-indigo-600" />,
        successMessage: isEditMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
    }), [isEditMode]);

    // Reset form when modal opens
    useEffect(() => {
        if (!isOpen) return;

        if (usuarioToEdit) {
            setCorreo(usuarioToEdit.correo_corp || '');
            setDebeCambiarPass(usuarioToEdit.debe_cambiar_pass || false);
            setIsBloqueado(usuarioToEdit.is_bloqueado || false);
            setSelectedRoles([]); // Roles logic remains distinct as before
        } else {
            setEmpleadoId('');
            setCorreo('');
            setPassword('');
            setSelectedRoles([]);
            setDebeCambiarPass(false);
            setIsBloqueado(false);
        }
        setIsChangePasswordMode(false);
        setErrors({});
        setTouched(new Set());
        setShowPassword(false);
    }, [isOpen, usuarioToEdit]);

    // Validate field
    const validateField = (field: string, value: unknown): string | undefined => {
        switch (field) {
            case 'empleado':
                if (!isEditMode && !value) return 'Selecciona un empleado';
                break;
            case 'correo':
                if (!value || (typeof value === 'string' && !value.trim())) return 'El correo es requerido';
                if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un correo válido';
                break;
            case 'password':
                if ((!isEditMode || isChangePasswordMode) && (!value || (typeof value === 'string' && !value.trim()))) return 'La contraseña es requerida';
                if ((!isEditMode || isChangePasswordMode) && typeof value === 'string' && value.length < 6) return 'Mínimo 6 caracteres';
                break;
            case 'roles':
                if (!Array.isArray(value) || value.length === 0) return 'Selecciona al menos un rol';
                break;
        }
        return undefined;
    };

    // Validate entire form
    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        if (!isEditMode) {
            const empleadoError = validateField('empleado', empleadoId);
            if (empleadoError) newErrors.empleado = empleadoError;
        }

        const correoError = validateField('correo', correo);
        if (correoError) newErrors.correo = correoError;

        if (!isEditMode || isChangePasswordMode) {
            const passwordError = validateField('password', password);
            if (passwordError) newErrors.password = passwordError;
        }

        const rolesError = validateField('roles', selectedRoles);
        if (rolesError) newErrors.roles = rolesError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [isEditMode, empleadoId, correo, password, selectedRoles, isChangePasswordMode]);

    // Handle blur for validation
    const handleBlur = (field: string, value: unknown) => {
        setTouched(prev => new Set(prev).add(field));
        const error = validateField(field, value);
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field as keyof FormErrors] = error;
            } else {
                delete newErrors[field as keyof FormErrors];
            }
            return newErrors;
        });
    };

    // Handle role toggle
    const toggleRole = (roleId: number) => {
        const newRoles = selectedRoles.includes(roleId)
            ? selectedRoles.filter(id => id !== roleId)
            : [...selectedRoles, roleId];
        setSelectedRoles(newRoles);
        if (touched.has('roles')) {
            const error = validateField('roles', newRoles);
            setErrors(prev => {
                const newErrors = { ...prev };
                if (error) newErrors.roles = error;
                else delete newErrors.roles;
                return newErrors;
            });
        }
    };

    // Submit handler
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all as touched
        setTouched(new Set(['empleado', 'correo', 'password', 'roles']));

        if (!validateForm()) {
            toast.error('Por favor corrija los errores en el formulario');
            return;
        }

        try {
            if (isEditMode && usuarioToEdit) {
                const updateData: UsuarioUpdate = {
                    correo_corp: correo,
                    debe_cambiar_pass: debeCambiarPass,
                    is_bloqueado: isBloqueado,
                    roles: selectedRoles,
                };
                await updateMutation.mutateAsync({ id: usuarioToEdit.id, data: updateData });

                // Cambiar contraseña si se solicitó
                if (isChangePasswordMode && password) {
                    await changePasswordMutation.mutateAsync({ id: usuarioToEdit.id, password: password });
                }
            } else {
                const createData: UsuarioCreate = {
                    empleado_id: empleadoId as number,
                    correo_corp: correo,
                    password: password,
                    roles: selectedRoles,
                };
                await createMutation.mutateAsync(createData);
            }
            toast.success(config.successMessage);
            handleClose();
        } catch (error: unknown) {
            const errMsg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || (error as { message?: string })?.message
                || 'Ocurrió un error';
            toast.error(errMsg);
        }
    }, [validateForm, isEditMode, usuarioToEdit, correo, debeCambiarPass, isBloqueado, selectedRoles, empleadoId, password, updateMutation, createMutation, changePasswordMutation, isChangePasswordMode, config.successMessage, handleClose]);

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            <ModalHeader icon={config.icon} title={config.title} />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">

                {/* Banner de errores */}
                {hasErrors && touched.size > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-700">Por favor corrija los errores:</p>
                            <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                                {Object.values(errors).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Empleado (solo crear) */}
                {!isEditMode && (
                    <SearchableSelect
                        label="Empleado"
                        required
                        value={empleadoId === '' ? null : empleadoId}
                        onChange={(val) => {
                            const newVal = val === null ? '' : Number(val);
                            setEmpleadoId(newVal);
                            if (touched.has('empleado')) {
                                const error = validateField('empleado', newVal);
                                setErrors(prev => {
                                    const newErrors = { ...prev };
                                    if (error) newErrors.empleado = error;
                                    else delete newErrors.empleado;
                                    return newErrors;
                                });
                            }
                        }}
                        options={empleadosDisponibles.map(emp => ({
                            id: emp.id,
                            label: emp.nombre_completo,
                            subLabel: emp.cargo_nombre || 'Sin cargo'
                        }))}
                        placeholder="Buscar empleado..."
                        searchPlaceholder="Buscar por nombre..."
                        disabled={isLoading || loadingEmpleados}
                        error={touched.has('empleado') ? errors.empleado : undefined}
                    />
                )}

                {/* Correo Corporativo */}
                <div className="space-y-1.5">
                    <label htmlFor="correo" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Correo Corporativo <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="correo"
                        type="email"
                        value={correo}
                        onChange={(e) => {
                            setCorreo(e.target.value);
                            if (touched.has('correo')) {
                                const error = validateField('correo', e.target.value);
                                setErrors(prev => {
                                    const newErrors = { ...prev };
                                    if (error) newErrors.correo = error;
                                    else delete newErrors.correo;
                                    return newErrors;
                                });
                            }
                        }}
                        onBlur={() => handleBlur('correo', correo)}
                        placeholder="usuario@grupocorban.com"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('correo') && errors.correo
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('correo') && errors.correo && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors.correo}
                        </p>
                    )}
                </div>

                {/* Opción Cambiar Contraseña (solo editar) */}
                {isEditMode && (
                    <div className="pt-2 pb-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-amber-50 p-2.5 rounded-xl border border-amber-100 hover:border-amber-200 transition-colors">
                            <input
                                type="checkbox"
                                checked={isChangePasswordMode}
                                onChange={(e) => {
                                    setIsChangePasswordMode(e.target.checked);
                                    if (!e.target.checked) {
                                        setPassword('');
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.password;
                                            return newErrors;
                                        })
                                    }
                                }}
                                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <div>
                                <span className="block text-sm font-semibold text-amber-700">Cambiar Contraseña</span>
                                <span className="block text-xs text-amber-600/80">Habilita el campo para establecer una nueva clave</span>
                            </div>
                        </label>
                    </div>
                )}

                {/* Contraseña */}
                {(!isEditMode || isChangePasswordMode) && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label htmlFor="password" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Contraseña <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (touched.has('password')) {
                                        const error = validateField('password', e.target.value);
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            if (error) newErrors.password = error;
                                            else delete newErrors.password;
                                            return newErrors;
                                        });
                                    }
                                }}
                                onBlur={() => handleBlur('password', password)}
                                placeholder="Mínimo 6 caracteres"
                                className={`w-full px-3 py-2.5 pr-10 rounded-xl border outline-none text-sm transition-colors ${touched.has('password') && errors.password
                                    ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                                    : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                                    }`}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {touched.has('password') && errors.password && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {errors.password}
                            </p>
                        )}
                    </div>
                )}
                {/* Roles */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Roles <span className="text-red-500">*</span>
                    </label>
                    <div className={`border rounded-xl p-3 space-y-2 ${touched.has('roles') && errors.roles
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                        }`}>
                        {loadingRoles ? (
                            <p className="text-sm text-gray-500">Cargando roles...</p>
                        ) : roles.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay roles disponibles</p>
                        ) : (
                            roles.map((rol) => (
                                <label key={rol.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(rol.id)}
                                        onChange={() => toggleRole(rol.id)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">{rol.nombre}</span>
                                    {rol.descripcion && (
                                        <span className="text-xs text-gray-400 ml-auto">{rol.descripcion}</span>
                                    )}
                                </label>
                            ))
                        )}
                    </div>
                    {touched.has('roles') && errors.roles && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors.roles}
                        </p>
                    )}
                </div>

                {/* Opciones adicionales (solo editar) */}
                {isEditMode && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={debeCambiarPass}
                                onChange={(e) => setDebeCambiarPass(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">Forzar cambio de contraseña</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isBloqueado}
                                onChange={(e) => setIsBloqueado(e.target.checked)}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">Usuario bloqueado</span>
                        </label>
                    </div>
                )}
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
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {isEditMode ? 'Actualizar' : 'Guardar'}</>}
                </button>
            </ModalFooter>
        </>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ModalUsuario({ isOpen, onClose, usuarioToEdit = null }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalContent usuarioToEdit={usuarioToEdit} isOpen={isOpen} />
        </ModalBase>
    );
}
