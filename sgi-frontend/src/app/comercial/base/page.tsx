'use client';

import { useState } from 'react';
import {
  Database, Upload, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useBaseComercial } from '@/hooks/comercial/useBaseComercial';
import { ContactoAsignado, CasoLlamada } from '@/types/base-comercial';
import ModalContactosCliente from '../cartera/components/modal-contactos-cliente';
import BaseStatsBar from './components/BaseStatsBar';
import FeedbackRow from './components/FeedbackRow';

interface FeedbackState {
  contesto: boolean | null;
  caso_id: number;
  comentario: string;
}

export default function BaseComercialPage() {
  const {
    contactos, casos,
    isLoading, isLoadingContactos,
    tieneContactosSinGuardar, tieneContactos,
    cargarBase, isCargarBaseLoading,
    actualizarFeedback, isActualizandoFeedback,
    refetch
  } = useBaseComercial();



  // Feedback local para todos los contactos
  const [feedbackLocal, setFeedbackLocal] = useState<{ [key: number]: FeedbackState }>({});

  // Modal de contactos
  const [isContactosModalOpen, setIsContactosModalOpen] = useState(false);
  const [contactosRuc, setContactosRuc] = useState('');
  const [contactosRazonSocial, setContactosRazonSocial] = useState('');

  // Filas editadas después de guardar
  const [editedAfterSave, setEditedAfterSave] = useState<Set<number>>(new Set());

  // Separar casos por contestado
  const casosContesto = casos.filter((c: CasoLlamada) => c.contestado);
  const casosNoContesto = casos.filter((c: CasoLlamada) => !c.contestado);

  // Obtener feedback (local o del servidor)
  const getFeedback = (contacto: ContactoAsignado): FeedbackState => {
    if (feedbackLocal[contacto.id]) {
      return feedbackLocal[contacto.id];
    }
    const casoActual = casos.find((c: CasoLlamada) => c.id === contacto.caso_id);
    return {
      contesto: casoActual ? casoActual.contestado : null,
      caso_id: contacto.caso_id || 0,
      comentario: contacto.comentario || ''
    };
  };

  // Handlers
  const handleCargarBase = async () => {
    try {
      const result = await cargarBase({});

      let mensaje = `¡${result.cantidad} contactos cargados!`;
      if (result.contactos_liberados && result.contactos_liberados > 0) {
        mensaje += ` (${result.contactos_liberados} liberados por inactividad)`;
      }

      const excluidos = result.rucs_excluidos;
      if (excluidos && (excluidos.CAIDO || excluidos.INACTIVO)) {
        const partes = [];
        if (excluidos.CAIDO) partes.push(`${excluidos.CAIDO} caídos`);
        if (excluidos.INACTIVO) partes.push(`${excluidos.INACTIVO} inactivos`);
        toast.info(`RUCs excluidos: ${partes.join(', ')}`, { duration: 5000 });
      }

      toast.success(mensaje);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Error al cargar base');
    }
  };

  const handleGuardarFeedback = async (contacto: ContactoAsignado) => {
    const fb = getFeedback(contacto);
    if (!fb.caso_id || !fb.comentario?.trim()) {
      toast.error('Completa el caso y comentario');
      return;
    }
    try {
      await actualizarFeedback({ id: contacto.id, casoId: fb.caso_id, comentario: fb.comentario });
      toast.success('Feedback guardado');
      setEditedAfterSave(prev => { const s = new Set(prev); s.delete(contacto.id); return s; });
      refetch();
    } catch {
      toast.error('Error al guardar feedback');
    }
  };

  const handleFeedbackChange = (id: number, fb: FeedbackState) => {
    setFeedbackLocal(prev => ({ ...prev, [id]: fb }));
  };

  const handleMarkEdited = (id: number) => {
    setEditedAfterSave(prev => { const s = new Set(prev); s.add(id); return s; });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-indigo-600" />
            Base de Prospectos
          </h1>
          <p className="text-sm text-gray-500">Gestiona tus contactos asignados y registra el feedback</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCargarBase}
            disabled={tieneContactosSinGuardar || isCargarBaseLoading}
            className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all disabled:cursor-not-allowed"
            title={tieneContactosSinGuardar ? 'Guarda todos los registros antes de cargar más' : 'Cargar 50 nuevos contactos'}
          >
            {isCargarBaseLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            Cargar Base
          </button>
        </div>
      </div>



      {/* Stats */}
      {tieneContactos && <BaseStatsBar contactos={contactos} />}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading || isLoadingContactos ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 size={40} className="animate-spin mb-3" />
            <p className="text-sm">Cargando contactos...</p>
          </div>
        ) : !tieneContactos ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Database size={48} className="mb-3" />
            <p className="text-lg font-medium">No tienes contactos asignados</p>
            <p className="text-sm">Haz clic en &quot;Cargar Base&quot; para obtener 50 contactos</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-280px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-gray-50 [&::-webkit-scrollbar-track]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-lg hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table className="w-full text-sm relative">
              <thead className="bg-gray-50 border-b sticky top-0 z-20 shadow-sm">
                <tr className="text-gray-600 text-xs uppercase">
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">RUC</th>
                  <th className="px-4 py-3 text-left font-semibold">Razón Social</th>
                  <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold">Correo</th>
                  <th className="px-4 py-3 text-left font-semibold">Contestó</th>
                  <th className="px-4 py-3 text-left font-semibold">Caso</th>
                  <th className="px-4 py-3 text-left font-semibold">Comentario</th>
                  <th className="px-4 py-3 text-center font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contactos.map((contacto: ContactoAsignado) => (
                  <FeedbackRow
                    key={contacto.id}
                    contacto={contacto}
                    feedback={getFeedback(contacto)}
                    casosContesto={casosContesto}
                    casosNoContesto={casosNoContesto}
                    isEdited={editedAfterSave.has(contacto.id)}
                    isActualizando={isActualizandoFeedback}
                    onFeedbackChange={handleFeedbackChange}
                    onGuardar={handleGuardarFeedback}
                    onMarkEdited={handleMarkEdited}
                    onOpenContactos={(ruc, razonSocial) => {
                      setContactosRuc(ruc);
                      setContactosRazonSocial(razonSocial);
                      setIsContactosModalOpen(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {tieneContactos && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>Haz clic en una fila para editar el feedback.</p>
          <button onClick={() => refetch()} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      )}

      {/* Modal Contactos */}
      <ModalContactosCliente
        isOpen={isContactosModalOpen}
        onClose={() => setIsContactosModalOpen(false)}
        ruc={contactosRuc}
        razonSocial={contactosRazonSocial}
      />
    </div>
  );
}