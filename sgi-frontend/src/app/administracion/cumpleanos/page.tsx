'use client';

import React from 'react';
import { useCumpleanos } from '@/hooks/organizacion/useEmpleado';
import { EmpleadoCumpleanos } from '@/types/organizacion/empleado-cumpleanos';
import { Loader2, Cake, CalendarDays } from 'lucide-react';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CumpleanosPage() {
    const { data: empleados = [], isLoading } = useCumpleanos();

    // Agrupar empleados por mes
    const empleadosPorMes = React.useMemo(() => {
        const agrupadoss: Record<number, EmpleadoCumpleanos[]> = {};

        // Inicializar array vacío para cada mes (0-11)
        for (let i = 0; i < 12; i++) {
            agrupadoss[i] = [];
        }

        empleados.forEach((emp: EmpleadoCumpleanos) => {
            if (emp.fecha_nacimiento) {
                // Parseamos la fecha manualmente para evitar problemas de zona horaria
                // asumiendo formato YYYY-MM-DD
                const parts = emp.fecha_nacimiento.split('-');
                const mes = parseInt(parts[1], 10) - 1; // 0-indexed

                if (mes >= 0 && mes <= 11) {
                    agrupadoss[mes].push(emp);
                }
            }
        });

        // Ordenar por día dentro de cada mes
        Object.keys(agrupadoss).forEach(key => {
            const mesIndex = parseInt(key, 10);
            agrupadoss[mesIndex].sort((a, b) => {
                const diaA = parseInt(a.fecha_nacimiento.split('-')[2], 10);
                const diaB = parseInt(b.fecha_nacimiento.split('-')[2], 10);
                return diaA - diaB;
            });
        });

        return agrupadoss;
    }, [empleados]);

    const currentMonth_index = new Date().getMonth();
    const currentDay = new Date().getDate();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Cake className="text-pink-500" size={32} />
                    Calendario de Cumpleaños
                </h1>
                <p className="text-gray-500 mt-2">
                    Visualiza y celebra los cumpleaños de todos los colaboradores de la empresa.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 size={40} className="animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {MONTHS.map((nombreMes, index) => {
                        const isCurrentMonth = index === currentMonth_index;
                        const cumpleaneros = empleadosPorMes[index] || [];

                        return (
                            <div
                                key={nombreMes}
                                className={`
                                    rounded-2xl border flex flex-col h-full bg-white shadow-sm transition-all hover:shadow-md
                                    ${isCurrentMonth ? 'border-pink-300 ring-4 ring-pink-50' : 'border-gray-200'}
                                `}
                            >
                                {/* Cabecera del Mes */}
                                <div className={`
                                    p-4 rounded-t-2xl border-b font-bold text-lg flex justify-between items-center
                                    ${isCurrentMonth ? 'bg-pink-50 text-pink-700 border-pink-100' : 'bg-gray-50 text-gray-700 border-gray-100'}
                                `}>
                                    <span>{nombreMes}</span>
                                    {isCurrentMonth && (
                                        <span className="text-xs bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full">Actual</span>
                                    )}
                                </div>

                                {/* Lista de Cumpleañeros */}
                                <div className="p-4 flex-1">
                                    {cumpleaneros.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 text-sm">
                                            <CalendarDays size={24} className="mb-2 opacity-50" />
                                            <span>Sin cumpleaños</span>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {cumpleaneros.map(emp => {
                                                const dia = parseInt(emp.fecha_nacimiento.split('-')[2], 10);
                                                const isToday = isCurrentMonth && dia === currentDay;

                                                return (
                                                    <li key={emp.id} className="flex gap-3 items-start group">
                                                        <div className={`
                                                            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                                                            ${isToday
                                                                ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 animate-pulse'
                                                                : 'bg-indigo-50 text-indigo-600'}
                                                        `}>
                                                            {dia}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${isToday ? 'text-pink-600' : 'text-gray-800'}`}>
                                                                {emp.nombres} {emp.apellido_paterno}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {emp.cargo_nombre || 'Sin cargo'}
                                                            </p>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>

                                {/* Footer total */}
                                <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-center">
                                    {cumpleaneros.length} {cumpleaneros.length === 1 ? 'cumpleaños' : 'cumpleaños'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
