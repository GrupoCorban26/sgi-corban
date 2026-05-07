import { useState, useCallback, useEffect } from 'react';
import { Cliente, ClienteCreate, ClienteUpdate } from '@/types/cliente';
import { useClientes } from '@/hooks/comercial/useClientes';
import { toast } from 'sonner';

export interface FormErrors {
    razon_social?: string;
    ruc?: string;
    proxima_fecha_contacto?: string;
}

interface UseClienteFormProps {
    clienteToEdit?: Cliente | null;
    initialData?: Partial<ClienteUpdate>;
    onSuccess?: (ruc: string, razonSocial: string, id?: number) => void;
    onClose?: () => void;
    isFromBuzon?: boolean;
}

export function useClienteForm({ clienteToEdit, initialData, onSuccess, onClose, isFromBuzon }: UseClienteFormProps) {
    const isEditMode = !!clienteToEdit;
    const { createMutation, updateMutation } = useClientes();

    // Form state
    const [ruc, setRuc] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [direccionFiscal, setDireccionFiscal] = useState('');
    const [estadoId, setEstadoId] = useState<number | null>(1); // 1 = Prospecto
    const [proximaFecha, setProximaFecha] = useState('');
    const [comercialEncargadoId, setComercialEncargadoId] = useState<number | null>(null);

    // Validation state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // Reset form
    useEffect(() => {
        if (clienteToEdit) {
            setRuc(clienteToEdit.ruc || '');
            setRazonSocial(clienteToEdit.razon_social || '');
            setDireccionFiscal(clienteToEdit.direccion_fiscal || '');
            setEstadoId(clienteToEdit.estado_id || 1);
            setProximaFecha(clienteToEdit.proxima_fecha_contacto || '');
            setComercialEncargadoId(clienteToEdit.comercial_encargado_id || null);
        } else if (initialData) {
            setRuc(initialData.ruc || '');
            setRazonSocial(initialData.razon_social || '');
            setDireccionFiscal(initialData.direccion_fiscal || '');
            setEstadoId(initialData.estado_id || 1);
            setProximaFecha(initialData.proxima_fecha_contacto ? String(initialData.proxima_fecha_contacto) : '');
            setComercialEncargadoId(initialData.comercial_encargado_id || null);
        } else {
            setRuc('');
            setRazonSocial('');
            setDireccionFiscal('');
            setEstadoId(1);
            setProximaFecha('');
            setComercialEncargadoId(null);
        }
        setErrors({});
        setTouched(new Set());
    }, [clienteToEdit, initialData]);

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
            case 'proxima_fecha_contacto':
                if (!value) return 'La fecha de próximo contacto es requerida';
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
            proxima_fecha_contacto: proximaFecha
        };

        Object.entries(fields).forEach(([key, value]) => {
            const error = validateField(key, value);
            if (error) newErrors[key as keyof FormErrors] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [razonSocial, ruc, proximaFecha]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(new Set(['razon_social', 'ruc', 'proxima_fecha_contacto']));

        if (!validateForm()) {
            toast.error('Por favor corrija los errores en el formulario');
            return;
        }

        try {
            const commonData = {
                ruc: ruc || null,
                razon_social: razonSocial.trim(),
                direccion_fiscal: direccionFiscal.trim() || null,
                estado_id: isFromBuzon ? 3 : estadoId,
                proxima_fecha_contacto: proximaFecha || null,
                comercial_encargado_id: comercialEncargadoId
            };

            if (isEditMode && clienteToEdit) {
                await updateMutation.mutateAsync({ id: clienteToEdit.id, data: commonData });
                toast.success('Cliente actualizado correctamente');
            } else {
                const response = await createMutation.mutateAsync(commonData);
                toast.success('Cliente creado correctamente');
                if (onSuccess) {
                    onSuccess(ruc, razonSocial.trim(), response.id);
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
            direccionFiscal, setDireccionFiscal,
            estadoId, setEstadoId,
            proximaFecha, setProximaFecha,
            comercialEncargadoId, setComercialEncargadoId
        },
        errors,
        touched,
        isLoading,
        handleBlur,
        handleSubmit,
        isEditMode
    };
}
