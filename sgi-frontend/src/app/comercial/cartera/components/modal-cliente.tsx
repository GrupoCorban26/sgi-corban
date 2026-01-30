'use client';

import React, { useMemo } from 'react';
import { Save, Building2, Loader2, AlertCircle, Users } from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { ModalBase, ModalHeader, ModalFooter, useModalContext } from '@/components/ui/modal';
import { useClienteForm } from '@/hooks/comercial/useClienteForm';
import { useAreas } from '@/hooks/organizacion/useAreas';
import { useComerciales } from '@/hooks/organizacion/useComerciales';

// ============================================
// TIPOS
// ============================================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    clienteToEdit?: Cliente | null;
    onClienteCreado?: (ruc: string, razonSocial: string) => void;
    showAdminFields?: boolean;
}

interface ModalContentProps {
    clienteToEdit: Cliente | null;
    isOpen: boolean;
    onClienteCreado?: (ruc: string, razonSocial: string) => void;
    showAdminFields?: boolean;
}

// ============================================
// COMPONENTE INTERNO
// ============================================
function ModalContent({ clienteToEdit, isOpen, onClienteCreado, showAdminFields }: ModalContentProps) {
    const { handleClose } = useModalContext();
    const {
        formState,
        errors,
        touched,
        isLoading,
        handleBlur,
        handleSubmit,
        isEditMode
    } = useClienteForm({
        clienteToEdit,
        onSuccess: onClienteCreado,
        onClose: handleClose
    });

    // Hooks para admin fields
    const { data: areas = [], isLoading: loadingAreas } = useAreas();
    const { data: comerciales = [], isLoading: loadingComerciales } = useComerciales();

    const config = useMemo(() => ({
        title: isEditMode ? 'Editar Cliente' : 'Nuevo Cliente',
        icon: <Building2 size={20} className="text-indigo-600" />,
    }), [isEditMode]);

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            <ModalHeader icon={config.icon} title={config.title} />

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">

                {/* Si es admin/jefe: Asignación de Área y Comercial */}
                {showAdminFields && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <div className="col-span-2">
                            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Users size={14} /> Asignación Administrativa
                            </h3>
                        </div>

                        {/* Área Encargada */}
                        <div className="space-y-1.5">
                            <label htmlFor="area" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Área Encargada</label>
                            <select
                                id="area"
                                value={formState.areaEncargadaId || ''}
                                onChange={(e) => formState.setAreaEncargadaId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                                disabled={isLoading || loadingAreas}
                            >
                                <option value="">Sin asignar</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.id}>{area.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Comercial Asignado */}
                        <div className="space-y-1.5">
                            <label htmlFor="comercial" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comercial Asignado</label>
                            <select
                                id="comercial"
                                value={formState.comercialEncargadoId || ''}
                                onChange={(e) => formState.setComercialEncargadoId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                                disabled={isLoading || loadingComerciales}
                            >
                                <option value="">Sin asignar</option>
                                {comerciales.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Error banner */}
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

                {/* RUC */}
                <div className="space-y-1.5">
                    <label htmlFor="ruc" className="text-xs font-bold text-gray-500 uppercase tracking-wider">RUC</label>
                    <input
                        id="ruc"
                        type="text"
                        value={formState.ruc}
                        onChange={(e) => formState.setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        onBlur={() => handleBlur('ruc', formState.ruc)}
                        placeholder="20123456789"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors font-mono ${touched.has('ruc') && errors.ruc
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                        maxLength={11}
                    />
                    {touched.has('ruc') && errors.ruc && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.ruc}
                        </p>
                    )}
                </div>

                {/* Razón Social */}
                <div className="space-y-1.5">
                    <label htmlFor="razon_social" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Razón Social <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="razon_social"
                        type="text"
                        value={formState.razonSocial}
                        onChange={(e) => formState.setRazonSocial(e.target.value)}
                        onBlur={() => handleBlur('razon_social', formState.razonSocial)}
                        placeholder="Empresa SAC"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('razon_social') && errors.razon_social
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                        autoFocus
                    />
                    {touched.has('razon_social') && errors.razon_social && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.razon_social}
                        </p>
                    )}
                </div>

                {/* Nombre Comercial */}
                <div className="space-y-1.5">
                    <label htmlFor="nombre_comercial" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Comercial</label>
                    <input
                        id="nombre_comercial"
                        type="text"
                        value={formState.nombreComercial}
                        onChange={(e) => formState.setNombreComercial(e.target.value)}
                        placeholder="Nombre de marca (opcional)"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    />
                </div>

                {/* Dirección Fiscal */}
                <div className="space-y-1.5">
                    <label htmlFor="direccion" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección Fiscal</label>
                    <input
                        id="direccion"
                        type="text"
                        value={formState.direccionFiscal}
                        onChange={(e) => formState.setDireccionFiscal(e.target.value)}
                        placeholder="Av. Principal 123, Lima"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                    <label htmlFor="estado" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</label>
                    <select
                        id="estado"
                        value={formState.tipoEstado}
                        onChange={(e) => formState.setTipoEstado(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none bg-white text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                        disabled={isLoading}
                    >
                        <option value="PROSPECTO">Prospecto</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="INACTIVO">Inactivo</option>
                    </select>
                </div>

                {/* Fecha de Último Contacto */}
                <div className="space-y-1.5">
                    <label htmlFor="ultimo_contacto" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Fecha de Último Contacto <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="ultimo_contacto"
                        type="date"
                        value={formState.ultimoContacto}
                        onChange={(e) => formState.setUltimoContacto(e.target.value)}
                        onBlur={() => handleBlur('ultimo_contacto', formState.ultimoContacto)}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('ultimo_contacto') && errors.ultimo_contacto
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('ultimo_contacto') && errors.ultimo_contacto && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.ultimo_contacto}
                        </p>
                    )}
                </div>

                {/* Próxima Fecha de Contacto */}
                <div className="space-y-1.5">
                    <label htmlFor="proxima_fecha" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Próxima Fecha de Contacto <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="proxima_fecha"
                        type="date"
                        value={formState.proximaFecha}
                        onChange={(e) => formState.setProximaFecha(e.target.value)}
                        onBlur={() => handleBlur('proxima_fecha_contacto', formState.proximaFecha)}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${touched.has('proxima_fecha_contacto') && errors.proxima_fecha_contacto
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('proxima_fecha_contacto') && errors.proxima_fecha_contacto && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.proxima_fecha_contacto}
                        </p>
                    )}
                </div>

                {/* Comentario */}
                <div className="space-y-1.5">
                    <label htmlFor="comentario" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Comentario <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="comentario"
                        rows={2}
                        value={formState.comentario}
                        onChange={(e) => formState.setComentario(e.target.value)}
                        onBlur={() => handleBlur('comentario', formState.comentario)}
                        placeholder="Notas sobre el cliente..."
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none resize-none text-sm transition-colors ${touched.has('comentario') && errors.comentario
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 bg-red-50'
                            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500/50'
                            }`}
                        disabled={isLoading}
                    />
                    {touched.has('comentario') && errors.comentario && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.comentario}
                        </p>
                    )}
                </div>
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
export default function ModalCliente({ isOpen, onClose, clienteToEdit = null, onClienteCreado, showAdminFields = false }: ModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalContent
                clienteToEdit={clienteToEdit}
                isOpen={isOpen}
                onClienteCreado={onClienteCreado}
                showAdminFields={showAdminFields}
            />
        </ModalBase>
    );
}
