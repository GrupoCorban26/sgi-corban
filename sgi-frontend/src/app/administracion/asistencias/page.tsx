'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, Clock, AlertTriangle, Download, Users, ChevronDown, ChevronRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    useProcesarAsistencia,
    exportarReporteAsistencia,
    AsistenciaReporteResponse,
    TardanzaEmpleado,
} from '@/hooks/useAsistencia';

export default function AsistenciasPage() {
    const [resultado, setResultado] = useState<AsistenciaReporteResponse | null>(null);
    const [archivoActual, setArchivoActual] = useState<File | null>(null);
    const [horaCorte, setHoraCorte] = useState('08:10');
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [exportando, setExportando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const procesarMutation = useProcesarAsistencia();

    // ============================================
    // HANDLERS
    // ============================================
    const procesarArchivo = useCallback(async (archivo: File) => {
        setArchivoActual(archivo);
        setExpandidos(new Set());

        try {
            const data = await procesarMutation.mutateAsync({ archivo, horaCorte });
            setResultado(data);
            toast.success(`Reporte procesado: ${data.total_empleados} empleados analizados`);
        } catch (error: unknown) {
            const mensaje = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'Error al procesar el archivo';
            toast.error(mensaje);
            setResultado(null);
        }
    }, [horaCorte, procesarMutation]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const archivos = e.dataTransfer.files;
        if (archivos.length > 0) {
            procesarArchivo(archivos[0]);
        }
    }, [procesarArchivo]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const archivos = e.target.files;
        if (archivos && archivos.length > 0) {
            procesarArchivo(archivos[0]);
        }
        // Limpiar el input para permitir resubir el mismo archivo
        if (inputRef.current) inputRef.current.value = '';
    }, [procesarArchivo]);

    const handleExportar = async () => {
        if (!archivoActual) return;
        setExportando(true);
        try {
            await exportarReporteAsistencia(archivoActual, horaCorte);
            toast.success('Reporte exportado exitosamente');
        } catch {
            toast.error('Error al exportar el reporte');
        } finally {
            setExportando(false);
        }
    };

    const toggleExpandido = (id: string) => {
        setExpandidos(prev => {
            const nuevo = new Set(prev);
            if (nuevo.has(id)) {
                nuevo.delete(id);
            } else {
                nuevo.add(id);
            }
            return nuevo;
        });
    };

    const limpiar = () => {
        setResultado(null);
        setArchivoActual(null);
        setExpandidos(new Set());
    };

    const formatearMinutos = (minutos: number): string => {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        if (horas > 0) return `${horas}h ${mins}m`;
        return `${mins}m`;
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reporte de Asistencia</h1>
                    <p className="text-sm text-gray-500">Sube un reporte Excel para analizar las tardanzas del personal</p>
                </div>

                {resultado && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportar}
                            disabled={exportando}
                            className="cursor-pointer flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-emerald-200 transition-colors"
                        >
                            {exportando ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Exportar a Excel
                        </button>
                        <button
                            onClick={limpiar}
                            className="cursor-pointer flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                        >
                            <X size={18} />
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            {/* Configuración + Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Hora de corte */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                        <Clock size={16} className="text-indigo-500" />
                        Hora de Corte
                    </label>
                    <input
                        type="time"
                        value={horaCorte}
                        onChange={(e) => setHoraCorte(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        Entradas después de esta hora se consideran tardanza
                    </p>
                </div>

                {/* Zona de Upload */}
                <div className="lg:col-span-3">
                    <div
                        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`
                            cursor-pointer bg-white rounded-2xl shadow-sm border-2 border-dashed p-8
                            flex flex-col items-center justify-center gap-3 transition-all duration-200
                            ${isDragging
                                ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                            }
                            ${procesarMutation.isPending ? 'opacity-60 pointer-events-none' : ''}
                        `}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xls,.xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {procesarMutation.isPending ? (
                            <>
                                <Loader2 size={40} className="text-indigo-500 animate-spin" />
                                <p className="text-sm font-medium text-indigo-600">Procesando reporte...</p>
                            </>
                        ) : (
                            <>
                                <Upload size={40} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-700">
                                        {archivoActual
                                            ? `Archivo cargado: ${archivoActual.name}`
                                            : 'Arrastra tu archivo Excel aquí o haz clic para seleccionar'
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Formatos aceptados: .xls, .xlsx</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Resultados */}
            {resultado && (
                <>
                    {/* Cards de resumen */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <CardResumen
                            icono={<FileSpreadsheet size={20} />}
                            titulo="Periodo"
                            valor={resultado.periodo}
                            color="indigo"
                        />
                        <CardResumen
                            icono={<Users size={20} />}
                            titulo="Empleados Analizados"
                            valor={resultado.total_empleados.toString()}
                            color="blue"
                        />
                        <CardResumen
                            icono={<AlertTriangle size={20} />}
                            titulo="Con Tardanzas"
                            valor={resultado.total_con_tardanzas.toString()}
                            color="amber"
                        />
                        <CardResumen
                            icono={<Clock size={20} />}
                            titulo="Hora de Corte"
                            valor={resultado.hora_corte}
                            color="emerald"
                        />
                    </div>

                    {/* Tabla de tardanzas */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800">Detalle de Tardanzas</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Haz clic en una fila para ver el detalle por día
                            </p>
                        </div>

                        {resultado.empleados.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                    <Clock size={28} className="text-emerald-600" />
                                </div>
                                <p className="text-lg font-medium text-gray-700">¡Sin tardanzas!</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Todos los empleados llegaron antes de las {resultado.hora_corte}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-6 py-3 font-semibold text-gray-600 w-10">#</th>
                                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Empleado</th>
                                            <th className="text-center px-6 py-3 font-semibold text-gray-600">Días Tarde</th>
                                            <th className="text-center px-6 py-3 font-semibold text-gray-600">Total Tardanza</th>
                                            <th className="text-center px-6 py-3 font-semibold text-gray-600">Total Trabajado</th>
                                            <th className="text-center px-6 py-3 font-semibold text-gray-600 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultado.empleados.map((emp, idx) => (
                                            <FilaEmpleado
                                                key={emp.id_empleado}
                                                empleado={emp}
                                                indice={idx + 1}
                                                expandido={expandidos.has(emp.id_empleado)}
                                                onToggle={() => toggleExpandido(emp.id_empleado)}
                                                formatearMinutos={formatearMinutos}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function CardResumen({ icono, titulo, valor, color }: {
    icono: React.ReactNode;
    titulo: string;
    valor: string;
    color: 'indigo' | 'blue' | 'amber' | 'emerald';
}) {
    const colores = {
        indigo: 'bg-indigo-50 text-indigo-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colores[color]}`}>
                    {icono}
                </div>
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{titulo}</p>
                    <p className="text-lg font-bold text-gray-800 mt-0.5">{valor}</p>
                </div>
            </div>
        </div>
    );
}

function FilaEmpleado({ empleado, indice, expandido, onToggle, formatearMinutos }: {
    empleado: TardanzaEmpleado;
    indice: number;
    expandido: boolean;
    onToggle: () => void;
    formatearMinutos: (m: number) => string;
}) {
    const esAlerta = empleado.total_tardanzas >= 5;

    return (
        <>
            <tr
                onClick={onToggle}
                className={`
                    cursor-pointer border-b border-gray-100 transition-colors
                    ${esAlerta ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                    ${expandido ? 'bg-indigo-50' : ''}
                `}
            >
                <td className="px-6 py-3.5 text-gray-500 font-medium">{indice}</td>
                <td className="px-6 py-3.5">
                    <div>
                        <span className="font-medium text-gray-800">{empleado.nombre}</span>
                        <span className="text-xs text-gray-400 ml-2">ID: {empleado.id_empleado}</span>
                    </div>
                </td>
                <td className="px-6 py-3.5 text-center">
                    <span className={`
                        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                        ${esAlerta
                            ? 'bg-red-100 text-red-700'
                            : empleado.total_tardanzas >= 3
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                        }
                    `}>
                        {empleado.total_tardanzas} {empleado.total_tardanzas === 1 ? 'día' : 'días'}
                    </span>
                </td>
                <td className="px-6 py-3.5 text-center font-medium text-gray-700">
                    {formatearMinutos(empleado.total_minutos_tarde)}
                </td>
                <td className="px-6 py-3.5 text-center font-medium text-indigo-700">
                    {formatearMinutos(empleado.total_minutos_trabajados)}
                </td>
                <td className="px-6 py-3.5 text-center text-gray-400">
                    {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </td>
            </tr>

            {/* Detalle expandible */}
            {expandido && (
                <tr>
                    <td colSpan={6} className="px-6 py-0">
                        <div className="bg-gray-50 rounded-xl my-2 p-4 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Detalle de tardanzas — {empleado.nombre}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {empleado.detalle.map((d) => (
                                    <div
                                        key={d.fecha}
                                        className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-gray-400 w-16">
                                                Día {d.dia_numero}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800">
                                                {d.hora_entrada} - {d.hora_salida || '?'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                {formatearMinutos(d.minutos_trabajados)}
                                            </span>
                                            <span className={`
                                                text-xs font-semibold px-2 py-0.5 rounded-full
                                                ${d.minutos_tarde >= 30
                                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                                    : d.minutos_tarde >= 15
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                                                }
                                            `}>
                                                +{formatearMinutos(d.minutos_tarde)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}