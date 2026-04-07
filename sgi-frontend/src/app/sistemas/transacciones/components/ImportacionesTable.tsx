import { Loader2 } from 'lucide-react';
import { Importacion } from '@/types/importaciones';

interface ImportacionesTableProps {
  data: Importacion[];
  loading: boolean;
  onRowClick: (ruc: string, razonSocial: string) => void;
}

export default function ImportacionesTable({ data, loading, onRowClick }: ImportacionesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-700 font-medium border-b">
          <tr>
            <th className="px-4 py-3">RUC</th>
            <th className="px-4 py-3">Razón Social</th>
            <th className="px-4 py-3 text-center">Frecuencia</th>
            <th className="px-4 py-3 text-center">Prox. Embarque</th>
            <th className="px-4 py-3 text-right">FOB Anual</th>
            <th className="px-4 py-3 text-right">Flete Anual</th>
            <th className="px-4 py-3 text-right">Peso Anual (KG)</th>
            <th className="px-4 py-3 text-right">Embarques</th>
            <th className="px-4 py-3 text-right">Agentes</th>
            <th className="px-4 py-3">Países Origen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Cargando datos...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                No hay registros. Sube un Excel para comenzar.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick(String(item.ruc) || '', item.razon_social || '')}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{item.ruc}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={item.razon_social}>{item.razon_social}</td>
                <td className="px-4 py-3 text-center">
                  {item.categoria_frecuencia ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.categoria_frecuencia.toUpperCase().includes('ALTA') ? 'bg-green-100 text-green-800' :
                      item.categoria_frecuencia.toUpperCase().includes('MEDIA') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.categoria_frecuencia}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{item.prox_embarque_estimado || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                  {item.fob_anual_usd?.toLocaleString('es-PE', { style: 'currency', currency: 'USD' })}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {item.flete_anual_usd?.toLocaleString('es-PE', { style: 'currency', currency: 'USD' })}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{(item.peso_anual_kg || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{item.embarques_anuales?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{item.agentes_distintos || 0}</td>
                <td className="px-4 py-3 max-w-[150px] truncate" title={item.paises_origen}>{item.paises_origen}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
