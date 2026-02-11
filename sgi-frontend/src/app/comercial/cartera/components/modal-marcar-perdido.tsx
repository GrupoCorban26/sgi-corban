import React, { useState } from 'react';
import { ModalBase, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { AlertCircle, AlertTriangle, Archive, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ClienteMarcarPerdido } from '@/types/cliente';

interface ModalMarcarPerdidoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: ClienteMarcarPerdido) => Promise<void>;
    isLoading: boolean;
    clienteNombre: string;
}

const MOTIVOS_PERDIDA = [
    "Precios elevados",
    "Servicio no disponible",
    "Eligió competencia",
    "Sin presupuesto",
    "No contesta / Sin interés",
    "Otro"
];

export default function ModalMarcarPerdido({ isOpen, onClose, onConfirm, isLoading, clienteNombre }: ModalMarcarPerdidoProps) {
    const [motivo, setMotivo] = useState(MOTIVOS_PERDIDA[0]);
    const [otroMotivo, setOtroMotivo] = useState('');
    const [puedeReintentar, setPuedeReintentar] = useState(false);
    const [fechaReactivacion, setFechaReactivacion] = useState('');

    const handleSubmit = async () => {
        const motivoFinal = motivo === 'Otro' ? otroMotivo : motivo;
        if (!motivoFinal) return toast.error('Ingrese el motivo de pérdida');
        if (puedeReintentar && !fechaReactivacion) return toast.error('Seleccione una fecha de reactivación');

        await onConfirm({
            motivo_perdida: motivoFinal,
            fecha_reactivacion: puedeReintentar ? fechaReactivacion : null
        });

        onClose();
        resetForm();
    };

    const resetForm = () => {
        setMotivo(MOTIVOS_PERDIDA[0]);
        setOtroMotivo('');
        setPuedeReintentar(false);
        setFechaReactivacion('');
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                icon={<AlertTriangle className="text-red-600" />}
                title="Marcar como Perdido"
            />
            <p className="px-6 text-sm text-gray-500 mt-2">
                ¿Por qué se perdió la venta con {clienteNombre}?
            </p>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Selección de Motivo */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Motivo de pérdida</label>
                    <div className="grid grid-cols-1 gap-2">
                        {MOTIVOS_PERDIDA.map((m) => (
                            <label key={m} className={`
                                flex items-center p-3 border rounded-xl cursor-pointer transition-all
                                ${motivo === m ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:bg-gray-50'}
                            `}>
                                <input
                                    type="radio"
                                    name="motivo"
                                    value={m}
                                    checked={motivo === m}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="ml-2 text-sm">{m}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {motivo === 'Otro' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium text-gray-700">Especifique el motivo</label>
                        <textarea
                            value={otroMotivo}
                            onChange={(e) => setOtroMotivo(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none"
                            placeholder="Detalle la razón..."
                            rows={2}
                        />
                    </div>
                )}

                {/* Opción de reintento */}
                <div className="pt-4 border-t border-gray-100">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={puedeReintentar}
                            onChange={(e) => setPuedeReintentar(e.target.checked)}
                            className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900">¿Es un prospecto recuperable?</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Si marcas esta opción, el cliente se guardará como &quot;Perdido&quot; y te recordaremos contactarlo en la fecha que elijas.
                                Si no, se archivará como &quot;Inactivo&quot;.
                            </p>
                        </div>
                    </label>

                    {puedeReintentar && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 ml-7">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Fecha de reactivación/seguimiento
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-indigo-600" size={16} />
                                <input
                                    type="date"
                                    value={fechaReactivacion}
                                    onChange={(e) => setFechaReactivacion(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`
                        px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-all
                        ${isLoading ? 'bg-gray-400 cursor-not-allowed' : puedeReintentar ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}
                    `}
                >
                    {isLoading && <Loader2 className="animate-spin" size={16} />}
                    {puedeReintentar ? 'Guardar como Perdido (Recuperable)' : 'Archivar Cliente'}
                </button>
            </ModalFooter>
        </ModalBase>
    );
}
