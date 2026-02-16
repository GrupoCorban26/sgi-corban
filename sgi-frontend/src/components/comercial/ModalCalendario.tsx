
import React, { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, Info } from 'lucide-react';
import { Cita } from '@/hooks/comercial/useCitas';
import { ModalBase } from '@/components/ui/modal';

interface ModalCalendarioProps {
    isOpen: boolean;
    onClose: () => void;
    citas: Cita[];
}

export default function ModalCalendario({ isOpen, onClose, citas }: ModalCalendarioProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Initial selected date is today if open
    React.useEffect(() => {
        if (isOpen && !selectedDate) {
            setSelectedDate(new Date());
        }
    }, [isOpen, selectedDate]);

    // Calendar generation logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });

    const calendarDays = useMemo(() => {
        return eachDayOfInterval({
            start: startDate,
            end: endDate,
        });
    }, [startDate, endDate]);

    // Group citas by date
    const citasByDate = useMemo(() => {
        const map = new Map<string, Cita[]>();
        citas.forEach(cita => {
            const dateKey = format(parseISO(cita.fecha), 'yyyy-MM-dd');
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(cita);
        });
        return map;
    }, [citas]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const selectedDayCitas = selectedDate
        ? citasByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
        : [];

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
            <div className="flex flex-col h-[80vh]">
                {/* Custom Header */}
                <div className="p-5 border-b flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <CalendarIcon size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Calendario de Equipo</h2>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-base font-semibold capitalize min-w-[140px] text-center select-none text-gray-700">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <span className="sr-only">Cerrar</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Calendar Grid */}
                    <div className="flex-1 p-4 border-r flex flex-col overflow-y-auto">
                        <div className="grid grid-cols-7 mb-2 shrink-0">
                            {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr gap-1 flex-1 min-h-[400px]">
                            {calendarDays.map((day, dayIdx) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const dayCitas = citasByDate.get(dateKey) || [];
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <button
                                        key={day.toString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`
                                            relative p-1 flex flex-col items-start justify-start rounded-xl transition-all border min-h-[80px]
                                            ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300 border-transparent' : 'bg-white text-gray-700 border-gray-100 hover:border-indigo-200 hover:shadow-sm'}
                                            ${isSelected ? 'ring-2 ring-indigo-600 z-10 bg-indigo-50/10' : ''}
                                            ${isToday ? 'bg-indigo-50/30' : ''}
                                        `}
                                    >
                                        <span className={`text-xs p-1 rounded-full w-6 h-6 flex items-center justify-center font-medium
                                            ${isSelected ? 'bg-indigo-600 text-white shadow-md' : ''}
                                            ${isToday && !isSelected ? 'text-indigo-600 bg-indigo-100' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>

                                        {/* Indicators */}
                                        <div className="flex flex-col gap-0.5 mt-1 w-full px-1">
                                            {dayCitas.slice(0, 3).map((cita, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 w-full rounded-full flex items-center px-1
                                                        ${cita.estado === 'APROBADO' ? 'bg-green-100' :
                                                            cita.estado === 'PENDIENTE' ? 'bg-yellow-100' :
                                                                'bg-gray-100'}
                                                    `}
                                                >
                                                    <div className={`h-1 w-1 rounded-full mr-1 shrink-0
                                                        ${cita.estado === 'APROBADO' ? 'bg-green-500' :
                                                            cita.estado === 'PENDIENTE' ? 'bg-yellow-500' :
                                                                'bg-gray-400'}
                                                    `}></div>
                                                    <span className="text-[8px] truncate leading-none opacity-70 hidden xl:block">
                                                        {cita.hora.slice(0, 5)}
                                                    </span>
                                                </div>
                                            ))}
                                            {dayCitas.length > 3 && (
                                                <span className="text-[9px] text-gray-400 leading-none pl-1">
                                                    +{dayCitas.length - 3} más
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar Details */}
                    <div className="w-full md:w-80 bg-gray-50 flex flex-col shrink-0 border-l border-gray-100 shadow-inner">
                        <div className="p-4 border-b bg-white">
                            <h3 className="font-bold text-gray-800 text-lg capitalize">
                                {selectedDate
                                    ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                                    : 'Selecciona un día'}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                                {selectedDayCitas.length} citas programadas
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedDayCitas.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                                    <Info size={40} className="mb-2 opacity-20" />
                                    <p className="text-sm">No hay citas para este día</p>
                                    <p className="text-xs mt-1 opacity-70">Selecciona otro día en el calendario</p>
                                </div>
                            ) : (
                                selectedDayCitas.map(cita => (
                                    <div key={cita.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-2 group">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full 
                                                ${cita.estado === 'APROBADO' ? 'bg-green-100 text-green-700' :
                                                    cita.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100'}
                                            `}>
                                                {cita.estado}
                                            </span>
                                            <span className="text-xs font-mono text-gray-500 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                                                <Clock size={12} /> {cita.hora}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="font-bold text-sm text-gray-800 line-clamp-1" title={cita.cliente_razon_social}>
                                                {cita.cliente_razon_social}
                                            </p>
                                            {cita.comercial_nombre && (
                                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 mt-1 font-medium bg-indigo-50 w-fit px-1.5 py-0.5 rounded">
                                                    <User size={12} />
                                                    <span>{cita.comercial_nombre}</span>
                                                </div>
                                            )}
                                        </div>

                                        {cita.direccion && (
                                            <div className="text-xs text-gray-500 flex items-start gap-1.5 pt-1 border-t border-gray-50 mt-1">
                                                <MapPin size={12} className="mt-0.5 text-gray-400" />
                                                <span className="truncate">{cita.direccion}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ModalBase>
    );
}
