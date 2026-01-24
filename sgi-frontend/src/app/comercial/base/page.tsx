'use client';

import { useState } from 'react';
import {
  Database, Upload, Loader2, AlertCircle, Phone, Mail,
  CheckCircle2, RefreshCw, Filter, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useBaseComercial } from '@/hooks/useBaseComercial';
import { ContactoAsignado, CasoLlamada } from '@/types/base-comercial';
import { MultiSelect } from '@/components/ui/MultiSelect';

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
    tieneContactosSinGuardar,
    todosGuardados,
    tieneContactos,
    cargarBase,
    isCargarBaseLoading,
    actualizarFeedback,
    isActualizandoFeedback,
    refetch
  } = useBaseComercial();



  // ... (existing comments/code)

  // Estado para filtros
  const [paisSeleccionado, setPaisSeleccionado] = useState<string[]>([]);
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<string[]>([]);
  const [showFiltros, setShowFiltros] = useState(false);

  // Estado de feedback local para todos los contactos
  const [feedbackLocal, setFeedbackLocal] = useState<{ [key: number]: { contesto: boolean | null; caso_id: number; comentario: string } }>({});

  // Estado para rastrear filas guardadas (sin cambios pendientes)
  const [savedRows, setSavedRows] = useState<Set<number>>(new Set());

  // Inicializar feedbackLocal cuando se cargan los contactos
  const getFeedback = (contacto: ContactoAsignado) => {
    if (feedbackLocal[contacto.id]) {
      return feedbackLocal[contacto.id];
    }
    // Determinar contesto basado en caso actual
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
      const result = await cargarBase({
        paisOrigen: paisSeleccionado.length > 0 ? paisSeleccionado : undefined,
        partidaArancelaria: partidaSeleccionada.length > 0 ? partidaSeleccionada : undefined
      });
      toast.success(`¡${result.cantidad} contactos cargados!`);
      setShowFiltros(false);
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
      await actualizarFeedback({
        id: contacto.id,
        casoId: fb.caso_id,
        comentario: fb.comentario
      });
      toast.success('Feedback guardado');
      // Marcar como guardado (no borramos feedbackLocal para mantener el estado correcto)
      setSavedRows(prev => new Set(prev).add(contacto.id));
      refetch();
    } catch {
      toast.error('Error al guardar feedback');
    }
  };



  const getEstadoContacto = (contacto: ContactoAsignado): string => {
    const fb = getFeedback(contacto);
    if (fb.caso_id && fb.comentario) return 'completo';
    return 'incompleto';
  };

  // Separar casos por contestado
  const casosContesto = casos.filter((c: CasoLlamada) => c.contestado);
  const casosNoContesto = casos.filter((c: CasoLlamada) => !c.contestado);

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
            disabled={tieneContactosSinGuardar || isCargarBaseLoading}
            className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all disabled:cursor-not-allowed"
            title={tieneContactosSinGuardar ? 'Guarda todos los registros antes de cargar más' : 'Cargar 50 nuevos contactos'}
          >
            {isCargarBaseLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            Cargar Base
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFiltros && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Filtrar antes de cargar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">País de Origen</label>
              <MultiSelect
                options={filtros.paises.map(p => ({ value: p.pais, label: p.pais, count: p.cantidad }))}
                selectedValues={paisSeleccionado}
                onChange={setPaisSeleccionado}
                placeholder="Seleccionar países..."
                searchPlaceholder="Buscar país..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Partida Arancelaria</label>
              <MultiSelect
                options={filtros.partidas.map(p => ({ value: p.partida, label: p.partida, count: p.cantidad }))}
                selectedValues={partidaSeleccionada}
                onChange={setPartidaSeleccionada}
                placeholder="Seleccionar partidas..."
                searchPlaceholder="Buscar partida..."
              />
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
            <div className="text-sm opacity-80">Guardados</div>
            <div className="text-2xl font-bold">
              {contactos.filter((c: ContactoAsignado) => c.fecha_llamada !== null).length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-lg">
            <div className="text-sm opacity-80">Pendientes</div>
            <div className="text-2xl font-bold">
              {contactos.filter((c: ContactoAsignado) => c.fecha_llamada === null).length}
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
              <tbody className="divide-y divide-gray-100">
                {contactos.map((contacto: ContactoAsignado) => {
                  const estado = getEstadoContacto(contacto);
                  const fb = getFeedback(contacto);

                  // Filtrar casos según si contestó o no
                  const casosFiltrados = fb.contesto === true
                    ? casosContesto
                    : fb.contesto === false
                      ? casosNoContesto
                      : [];

                  return (
                    <tr
                      key={contacto.id}
                      className={`${ESTADO_STYLES[estado as keyof typeof ESTADO_STYLES]} transition-all duration-200 hover:shadow-sm`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{contacto.ruc}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="font-medium text-gray-800 truncate block" title={contacto.razon_social}>
                          {contacto.razon_social}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={14} className="text-indigo-400" />
                          <span className="text-xs">{contacto.telefono}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Mail size={14} className="text-indigo-400" />
                          <span className="text-xs truncate max-w-[140px]">{contacto.correo || '-'}</span>
                        </div>
                      </td>
                      {/* CONTESTÓ - Dropdown moderno siempre visible */}
                      <td className="px-3 py-2">
                        <div className="relative">
                          <select
                            value={fb.contesto === null ? '' : fb.contesto ? 'si' : 'no'}
                            onChange={(e) => {
                              const nuevoContesto = e.target.value === '' ? null : e.target.value === 'si';
                              setFeedbackLocal(prev => ({
                                ...prev,
                                [contacto.id]: {
                                  ...fb,
                                  contesto: nuevoContesto,
                                  caso_id: 0
                                }
                              }));
                              // Quitar de guardados si se edita
                              setSavedRows(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(contacto.id);
                                return newSet;
                              });
                            }}
                            className={`
                              w-24 appearance-none cursor-pointer
                              px-3 py-2 text-xs font-medium
                              border-2 rounded-xl
                              transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-offset-1
                              ${fb.contesto === true
                                ? 'bg-green-50 border-green-300 text-green-700 focus:ring-green-400'
                                : fb.contesto === false
                                  ? 'bg-red-50 border-red-300 text-red-700 focus:ring-red-400'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 focus:ring-indigo-400'
                              }
                            `}
                          >
                            <option value="">-- Sel --</option>
                            <option value="si">✓ Sí</option>
                            <option value="no">✗ No</option>
                          </select>
                        </div>
                      </td>
                      {/* CASO - Dropdown moderno siempre visible */}
                      <td className="px-3 py-2">
                        {fb.contesto === null ? (
                          <span className="text-xs text-gray-400 italic px-2">Primero contestó</span>
                        ) : (
                          <select
                            value={fb.caso_id}
                            onChange={(e) => {
                              setFeedbackLocal(prev => ({
                                ...prev,
                                [contacto.id]: { ...fb, caso_id: Number(e.target.value) }
                              }));
                              // Quitar de guardados si se edita
                              setSavedRows(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(contacto.id);
                                return newSet;
                              });
                            }}
                            className={`
                              w-full max-w-[180px] appearance-none cursor-pointer
                              px-3 py-2 text-xs font-medium
                              border-2 rounded-xl
                              transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-offset-1
                              ${fb.caso_id
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 focus:ring-indigo-400'
                                : 'bg-gray-50 border-gray-200 text-gray-600 focus:ring-indigo-400'
                              }
                            `}
                          >
                            <option value={0}>Seleccionar caso...</option>
                            {casosFiltrados.map((c: CasoLlamada) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      {/* COMENTARIO - Input siempre visible */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={fb.comentario}
                          onChange={(e) => {
                            setFeedbackLocal(prev => ({
                              ...prev,
                              [contacto.id]: { ...fb, comentario: e.target.value }
                            }));
                            // Quitar de guardados si se edita
                            setSavedRows(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(contacto.id);
                              return newSet;
                            });
                          }}
                          placeholder="Agregar comentario..."
                          className={`
                            w-full max-w-[200px]
                            px-3 py-2 text-xs
                            border-2 rounded-xl
                            transition-all duration-200
                            placeholder:text-gray-400
                            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                            ${fb.comentario
                              ? 'bg-blue-50 border-blue-200 text-gray-800'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                            }
                          `}
                        />
                      </td>
                      {/* ESTADO + GUARDAR */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-center">
                          {estado === 'completo' ? (
                            savedRows.has(contacto.id) ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                                <CheckCircle2 size={12} />
                                Guardado
                              </span>
                            ) : (
                              <button
                                onClick={() => handleGuardarFeedback(contacto)}
                                disabled={isActualizandoFeedback}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 disabled:opacity-50"
                              >
                                {isActualizandoFeedback ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                Guardar
                              </button>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <AlertCircle size={12} />
                              Pendiente
                            </span>
                          )}
                        </div>
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