'use client';

import { useState } from 'react';
import {
  Database, Upload, Send, Loader2, AlertCircle, Phone, Mail,
  Building2, CheckCircle2, XCircle, RefreshCw, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useBaseComercial } from '@/hooks/useBaseComercial';
import { ContactoAsignado, CasoLlamada } from '@/types/base-comercial';

// Colores para estados de feedback
const ESTADO_STYLES = {
  completo: 'bg-green-50 border-green-200',
  incompleto: 'bg-white border-gray-200',
  editando: 'bg-blue-50 border-blue-200'
};

export default function BaseComercialPage() {
  const {
    contactos,
    filtros,
    casos,
    isLoading,
    isLoadingContactos,
    todosTienenFeedback,
    tieneContactos,
    cargarBase,
    isCargarBaseLoading,
    actualizarFeedback,
    isActualizandoFeedback,
    enviarFeedback,
    isEnviandoFeedback,
    refetch
  } = useBaseComercial();

  // Estado para filtros
  const [paisSeleccionado, setPaisSeleccionado] = useState<string>('');
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<string>('');
  const [showFiltros, setShowFiltros] = useState(false);

  // Estado de edición local
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [feedbackLocal, setFeedbackLocal] = useState<{ [key: number]: { caso_id: number; comentario: string } }>({});

  // Handlers
  const handleCargarBase = async () => {
    try {
      const result = await cargarBase({
        paisOrigen: paisSeleccionado || undefined,
        partidaArancelaria: partidaSeleccionada || undefined
      });
      toast.success(`¡${result.cantidad} contactos cargados!`);
      setShowFiltros(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Error al cargar base');
    }
  };

  const handleGuardarFeedback = async (contacto: ContactoAsignado) => {
    const fb = feedbackLocal[contacto.id];
    if (!fb || !fb.caso_id || !fb.comentario?.trim()) {
      toast.error('Completa el caso y comentario');
      return;
    }

    try {
      await actualizarFeedback({
        id: contacto.id,
        casoId: fb.caso_id,
        comentario: fb.comentario
      });
      toast.success('Feedback guardado');
      setEditandoId(null);
      refetch();
    } catch {
      toast.error('Error al guardar feedback');
    }
  };

  const handleEnviarTodo = async () => {
    if (!todosTienenFeedback) {
      toast.error('Completa el feedback de todos los contactos');
      return;
    }

    try {
      const result = await enviarFeedback();
      toast.success(`¡${result.contactos_procesados} contactos procesados!`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Error al enviar feedback');
    }
  };

  const iniciarEdicion = (contacto: ContactoAsignado) => {
    setEditandoId(contacto.id);
    setFeedbackLocal(prev => ({
      ...prev,
      [contacto.id]: {
        caso_id: contacto.caso_id || 0,
        comentario: contacto.comentario || ''
      }
    }));
  };

  const getEstadoContacto = (contacto: ContactoAsignado): string => {
    if (editandoId === contacto.id) return 'editando';
    if (contacto.caso_id && contacto.comentario) return 'completo';
    return 'incompleto';
  };

  // Separar casos por tipo
  const casosPositivos = casos.filter((c: CasoLlamada) => c.is_positive);
  const casosNegativos = casos.filter((c: CasoLlamada) => !c.is_positive);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-indigo-600" />
            Base de Prospectos
          </h1>
          <p className="text-sm text-gray-500">
            Gestiona tus contactos asignados y registra el feedback
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-white transition-colors"
          >
            <Filter size={18} />
            Filtros
          </button>
          <button
            onClick={handleCargarBase}
            disabled={tieneContactos || isCargarBaseLoading}
            className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all disabled:cursor-not-allowed"
          >
            {isCargarBaseLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            Cargar Base
          </button>
          <button
            onClick={handleEnviarTodo}
            disabled={!todosTienenFeedback || isEnviandoFeedback}
            className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-green-200 transition-all disabled:cursor-not-allowed"
          >
            {isEnviandoFeedback ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Enviar Feedback
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFiltros && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Filtrar antes de cargar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">País de Origen</label>
              <select
                value={paisSeleccionado}
                onChange={(e) => setPaisSeleccionado(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="">Todos los países</option>
                {filtros.paises.map((p) => (
                  <option key={p.pais} value={p.pais}>
                    {p.pais} ({p.cantidad})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Partida Arancelaria</label>
              <select
                value={partidaSeleccionada}
                onChange={(e) => setPartidaSeleccionada(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="">Todas las partidas</option>
                {filtros.partidas.map((p) => (
                  <option key={p.partida} value={p.partida}>
                    {p.partida} ({p.cantidad})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {tieneContactos && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-lg">
            <div className="text-sm opacity-80">Total Asignados</div>
            <div className="text-2xl font-bold">{contactos.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg">
            <div className="text-sm opacity-80">Con Feedback</div>
            <div className="text-2xl font-bold">
              {contactos.filter((c: ContactoAsignado) => c.caso_id && c.comentario).length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-lg">
            <div className="text-sm opacity-80">Pendientes</div>
            <div className="text-2xl font-bold">
              {contactos.filter((c: ContactoAsignado) => !c.caso_id || !c.comentario).length}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Contactos */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-gray-600 text-xs uppercase">
                  <th className="px-4 py-3 text-left font-semibold">RUC</th>
                  <th className="px-4 py-3 text-left font-semibold">Razón Social</th>
                  <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold">Correo</th>
                  <th className="px-4 py-3 text-left font-semibold">Contestó</th>
                  <th className="px-4 py-3 text-left font-semibold">Caso</th>
                  <th className="px-4 py-3 text-left font-semibold">Comentario</th>
                  <th className="px-4 py-3 text-center font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contactos.map((contacto: ContactoAsignado) => {
                  const estado = getEstadoContacto(contacto);
                  const isEditing = editandoId === contacto.id;
                  const fb = feedbackLocal[contacto.id] || { caso_id: contacto.caso_id || 0, comentario: contacto.comentario || '' };

                  return (
                    <tr
                      key={contacto.id}
                      className={`${ESTADO_STYLES[estado as keyof typeof ESTADO_STYLES]} transition-colors cursor-pointer hover:bg-gray-50`}
                      onClick={() => !isEditing && iniciarEdicion(contacto)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{contacto.ruc}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={contacto.razon_social}>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-gray-400" />
                          {contacto.razon_social}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          {contacto.telefono}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          {contacto.correo || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100">
                            {fb.caso_id ? (casos.find((c: CasoLlamada) => c.id === fb.caso_id)?.contestado ? 'Sí' : 'No') : '-'}
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${contacto.contesto ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {contacto.caso_id ? (contacto.contesto ? 'Sí' : 'No') : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <select
                            value={fb.caso_id}
                            onChange={(e) => setFeedbackLocal(prev => ({
                              ...prev,
                              [contacto.id]: { ...fb, caso_id: Number(e.target.value) }
                            }))}
                            className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none"
                          >
                            <option value={0}>Seleccionar...</option>
                            <optgroup label="-- Positivos --">
                              {casosPositivos.map((c: CasoLlamada) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </optgroup>
                            <optgroup label="-- Negativos --">
                              {casosNegativos.map((c: CasoLlamada) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <span className="text-xs">{contacto.caso_nombre || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={fb.comentario}
                            onChange={(e) => setFeedbackLocal(prev => ({
                              ...prev,
                              [contacto.id]: { ...fb, comentario: e.target.value }
                            }))}
                            placeholder="Escribe un comentario..."
                            className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none"
                          />
                        ) : (
                          <span className="text-xs text-gray-600 max-w-[150px] truncate block">
                            {contacto.comentario || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleGuardarFeedback(contacto)}
                              disabled={isActualizandoFeedback}
                              className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                              title="Guardar"
                            >
                              {isActualizandoFeedback ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                              title="Cancelar"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estado === 'completo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {estado === 'completo' ? (
                              <>
                                <CheckCircle2 size={12} />
                                OK
                              </>
                            ) : (
                              <>
                                <AlertCircle size={12} />
                                Pendiente
                              </>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      {tieneContactos && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Haz clic en una fila para editar el feedback.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      )}
    </div>
  );
}