import { useState, useCallback, useEffect } from 'react';
import { Cliente, ClienteCreate, ClienteUpdate } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { toast } from 'sonner';

export interface FormErrors {
    razon_social?: string;
    ruc?: string;
    ultimo_contacto?: string;
    proxima_fecha_contacto?: string;
    comentario?: string;
}

interface UseClienteFormProps {
    clienteToEdit?: Cliente | null;
    onSuccess?: (ruc: string, razonSocial: string) => void;
    onClose?: () => void;
}

export function useClienteForm({ clienteToEdit, onSuccess, onClose }: UseClienteFormProps) {
    const isEditMode = !!clienteToEdit;
    const { createMutation, updateMutation } = useClientes();

    // Form state
    const [ruc, setRuc] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [nombreComercial, setNombreComercial] = useState('');
    const [direccionFiscal, setDireccionFiscal] = useState('');
    const [tipoEstado, setTipoEstado] = useState('PROSPECTO');
    const [ultimoContacto, setUltimoContacto] = useState('');
    const [comentario, setComentario] = useState('');
    const [proximaFecha, setProximaFecha] = useState('');

    // Validation state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // Reset form
    useEffect(() => {
        if (clienteToEdit) {
            setRuc(clienteToEdit.ruc || '');
            setRazonSocial(clienteToEdit.razon_social || '');
            setNombreComercial(clienteToEdit.nombre_comercial || '');
            setDireccionFiscal(clienteToEdit.direccion_fiscal || '');
            setTipoEstado(clienteToEdit.tipo_estado || 'PROSPECTO');
            setUltimoContacto(clienteToEdit.ultimo_contacto || '');
            setComentario(clienteToEdit.comentario_ultima_llamada || '');
            setProximaFecha(clienteToEdit.proxima_fecha_contacto || '');
        } else {
            setRuc('');
            setRazonSocial('');
            setNombreComercial('');
            setDireccionFiscal('');
            setTipoEstado('PROSPECTO');
            setUltimoContacto('');
            setComentario('');
            setProximaFecha('');
        }
        setErrors({});
        setTouched(new Set());
    }, [clienteToEdit]);

    const validateField = (field: string, value: string): string | undefined => {
        switch (field) {
            case 'razon_social':
                if (!value.trim()) return 'La razón social es requerida';
                if (value.trim().length < 3) return 'Mínimo 3 caracteres';
                break;
            case 'ruc':
                if (value && value.length !== 11) return 'El RUC debe tener 11 dígitos';
                if (value && !/^\d+$/.test(value)) return 'El RUC solo puede contener números';
                break;
            case 'ultimo_contacto':
                if (!value) return 'La fecha de último contacto es requerida';
                break;
            case 'proxima_fecha_contacto':
                if (!value) return 'La fecha de próximo contacto es requerida';
                break;
            case 'comentario':
                if (!value.trim()) return 'El comentario es requerido';
                if (value.trim().length < 5) return 'Mínimo 5 caracteres';
                break;
        }
        return undefined;
    };

    const handleBlur = (field: string, value: string) => {
        setTouched(prev => new Set(prev).add(field));
        const error = validateField(field, value);
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) newErrors[field as keyof FormErrors] = error;
            else delete newErrors[field as keyof FormErrors];
            return newErrors;
        });
    };

    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        const fields = {
            razon_social: razonSocial,
            ruc: ruc,
            ultimo_contacto: ultimoContacto,
            proxima_fecha_contacto: proximaFecha,
            comentario: comentario
        };

        Object.entries(fields).forEach(([key, value]) => {
            const error = validateField(key, value);
            if (error) newErrors[key as keyof FormErrors] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [razonSocial, ruc, ultimoContacto, proximaFecha, comentario]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(new Set(['razon_social', 'ruc', 'ultimo_contacto', 'proxima_fecha_contacto', 'comentario']));

        if (!validateForm()) {
            toast.error('Por favor corrija los errores en el formulario');
            return;
        }

        try {
            const commonData = {
                ruc: ruc || null,
                razon_social: razonSocial.trim(),
                nombre_comercial: nombreComercial.trim() || null,
                direccion_fiscal: direccionFiscal.trim() || null,
                tipo_estado: tipoEstado,
                ultimo_contacto: ultimoContacto,
                comentario_ultima_llamada: comentario.trim(),
                proxima_fecha_contacto: proximaFecha,
            };

            if (isEditMode && clienteToEdit) {
                await updateMutation.mutateAsync({ id: clienteToEdit.id, data: commonData });
                toast.success('Cliente actualizado correctamente');
            } else {
                await createMutation.mutateAsync(commonData);
                toast.success('Cliente creado correctamente');
                if (onSuccess && ruc) {
                    onSuccess(ruc, razonSocial.trim());
                }
            }
            if (onClose) onClose();
        } catch (error: unknown) {
            toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ocurrió un error');
        }
    };

    return {
        formState: {
            ruc, setRuc,
            razonSocial, setRazonSocial,
            nombreComercial, setNombreComercial,
            direccionFiscal, setDireccionFiscal,
            tipoEstado, setTipoEstado,
            ultimoContacto, setUltimoContacto,
            comentario, setComentario,
            proximaFecha, setProximaFecha
        },
        errors,
        touched,
        isLoading,
        handleBlur,
        handleSubmit,
        isEditMode
    };
}
