/**
 * Hook para procesamiento de reportes de asistencia.
 * Usa React Query (mutation) para subir el archivo Excel y obtener las tardanzas.
 */

import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

// ============================================
// TIPOS
// ============================================
export interface TardanzaDia {
    fecha: string;
    dia_numero: number;
    hora_entrada: string;
    hora_salida?: string | null;
    minutos_tarde: number;
    minutos_trabajados: number;
}

export interface TardanzaEmpleado {
    id_empleado: string;
    nombre: string;
    total_tardanzas: number;
    total_minutos_tarde: number;
    total_minutos_trabajados: number;
    detalle: TardanzaDia[];
}

export interface AsistenciaReporteResponse {
    periodo: string;
    hora_corte: string;
    total_empleados: number;
    total_con_tardanzas: number;
    empleados: TardanzaEmpleado[];
}

// ============================================
// HOOK: PROCESAR REPORTE DE ASISTENCIA
// ============================================
export const useProcesarAsistencia = () => {
    return useMutation({
        mutationFn: async ({ archivo, horaCorte }: { archivo: File; horaCorte: string }) => {
            const formData = new FormData();
            formData.append('file', archivo);

            const { data } = await api.post<AsistenciaReporteResponse>(
                `/administracion/asistencia/procesar-reporte?hora_corte=${encodeURIComponent(horaCorte)}`,
                formData,
            );
            return data;
        },
    });
};

// ============================================
// FUNCIÓN: EXPORTAR REPORTE A EXCEL
// ============================================
export const exportarReporteAsistencia = async (archivo: File, horaCorte: string) => {
    const formData = new FormData();
    formData.append('file', archivo);

    const response = await api.post(
        `/administracion/asistencia/exportar-reporte?hora_corte=${encodeURIComponent(horaCorte)}`,
        formData,
        {
            responseType: 'blob',
        }
    );

    // Crear el enlace de descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const enlace = document.createElement('a');
    enlace.href = url;

    // Intentar obtener nombre del archivo del header
    const disposicion = response.headers['content-disposition'];
    const nombreArchivo = disposicion
        ? disposicion.split('filename=')[1]?.replace(/"/g, '')
        : `reporte_tardanzas_${new Date().toISOString().slice(0, 10)}.xlsx`;

    enlace.setAttribute('download', nombreArchivo);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
};
