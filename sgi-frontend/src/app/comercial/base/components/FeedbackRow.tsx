import { Loader2, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { ContactoAsignado, CasoLlamada } from '@/types/base-comercial';

// Colores para estados de feedback
const ESTADO_STYLES = {
  completo: 'bg-green-50 border-green-200',
  incompleto: 'bg-white border-gray-200',
  editando: 'bg-blue-50 border-blue-200'
};

interface FeedbackState {
  contesto: boolean | null;
  caso_id: number;
  comentario: string;
}

interface FeedbackRowProps {
  contacto: ContactoAsignado;
  feedback: FeedbackState;
  casosContesto: CasoLlamada[];
  casosNoContesto: CasoLlamada[];
  isEdited: boolean;
  isActualizando: boolean;
  onFeedbackChange: (id: number, fb: FeedbackState) => void;
  onGuardar: (contacto: ContactoAsignado) => void;
  onMarkEdited: (id: number) => void;
  onOpenContactos: (ruc: string, razonSocial: string) => void;
}

export default function FeedbackRow({
  contacto,
  feedback,
  casosContesto,
  casosNoContesto,
  isEdited,
  isActualizando,
  onFeedbackChange,
  onGuardar,
  onMarkEdited,
  onOpenContactos,
}: FeedbackRowProps) {
  const fb = feedback;
  const estado = (fb.caso_id && fb.comentario) ? 'completo' : 'incompleto';

  const casosFiltrados = fb.contesto === true
    ? casosContesto
    : fb.contesto === false
      ? casosNoContesto
      : [];

  const handleContestoChange = (value: string) => {
    const nuevoContesto = value === '' ? null : value === 'si';
    onFeedbackChange(contacto.id, { ...fb, contesto: nuevoContesto, caso_id: 0 });
    onMarkEdited(contacto.id);
  };

  const handleCasoChange = (value: string) => {
    onFeedbackChange(contacto.id, { ...fb, caso_id: Number(value) });
    onMarkEdited(contacto.id);
  };

  const handleComentarioChange = (value: string) => {
    onFeedbackChange(contacto.id, { ...fb, comentario: value });
    onMarkEdited(contacto.id);
  };

  return (
    <tr className={`${ESTADO_STYLES[estado as keyof typeof ESTADO_STYLES]} transition-all duration-200 hover:shadow-sm`}>
      <td className="px-4 py-3 font-mono text-xs text-gray-600">{contacto.ruc}</td>
      <td className="px-4 py-3 max-w-[180px]">
        <span className="font-medium text-gray-800 truncate block" title={contacto.razon_social}>
          {contacto.razon_social}
        </span>
        <button
          onClick={() => onOpenContactos(contacto.ruc || '', contacto.razon_social || '')}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
          title="Agregar otro contacto a esta empresa"
        >
          <UserPlus size={12} /> Agregar contacto
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-700">{contacto.telefono || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-700 truncate max-w-[140px] block" title={contacto.correo || ''}>
          {contacto.correo || '-'}
        </span>
      </td>

      {/* Contestó */}
      <td className="px-3 py-2">
        <select
          value={fb.contesto === null ? '' : fb.contesto ? 'si' : 'no'}
          onChange={(e) => handleContestoChange(e.target.value)}
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
      </td>

      {/* Caso */}
      <td className="px-3 py-2">
        {fb.contesto === null ? (
          <span className="text-xs text-gray-400 italic px-2">Primero contestó</span>
        ) : (
          <select
            value={fb.caso_id}
            onChange={(e) => handleCasoChange(e.target.value)}
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
            {casosFiltrados.map((c: CasoLlamada) => {
              const esGestionable = c.gestionable || c.is_positive;
              return (
                <option
                  key={c.id}
                  value={c.id}
                  className={esGestionable ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700"}
                >
                  {esGestionable ? `✦ ${c.nombre}` : c.nombre}
                </option>
              );
            })}
          </select>
        )}
      </td>

      {/* Comentario */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={fb.comentario}
          onChange={(e) => handleComentarioChange(e.target.value)}
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

      {/* Estado + Guardar */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 justify-center">
          {estado === 'completo' ? (
            (contacto.fecha_llamada !== null && !isEdited) ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                <CheckCircle2 size={12} />
                Guardado
              </span>
            ) : (
              <button
                onClick={() => onGuardar(contacto)}
                disabled={isActualizando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 disabled:opacity-50"
              >
                {isActualizando ? (
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
}
