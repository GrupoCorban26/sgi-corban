import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Loader2, Phone, Calendar, AlertTriangle, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ClientReminder {
    id: number;
    razon_social: string;
    ruc: string;
    proxima_fecha_contacto: string;
    days_remaining: number;
    telefono: string;
    comercial_nombre?: string;
    comercial_id?: number;
}



export default function RecordatorioLlamadas() {
    const { user, isJefeComercial, isAdmin } = useCurrentUser();
    const isBoss = isJefeComercial() || isAdmin();

    const [reminders, setReminders] = useState<ClientReminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReminders();
        }
    }, [user]);

    const fetchReminders = async () => {
        try {
            const response = await api.get('/clientes/recordatorios', { params: { days: 5 } });
            setReminders(response.data);
        } catch (error) {
            console.error('Error obteniendo recordatorios:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getUrgencyColor = (days: number) => {
        if (days < 0) return 'bg-red-100 text-red-800 border-red-300 shadow-sm ring-1 ring-red-200/50';
        if (days === 0) return 'bg-green-50 text-green-700 border-green-200';
        if (days === 1) return 'bg-orange-50 text-orange-700 border-orange-200';
        if (days === 2) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (days === 3) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    const getUrgencyText = (days: number) => {
        if (days < 0) return `Venció hace ${Math.abs(days)} días`;
        if (days === 0) return 'Llamar HOY';
        if (days === 1) return 'Mañana';
        return `En ${days} días`;
    };

    if (!user) return <div className="p-6 h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Phone className="text-indigo-600" size={20} />
                    {isBoss ? 'Llamadas Pendientes (Equipo)' : 'Recordatorio de Llamadas'}
                </h3>
                <span className="text-xs font-medium bg-indigo-50 px-2 py-1 rounded text-indigo-600">
                    Seguimiento
                </span>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" />
                </div>
            ) : reminders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tienes llamadas pendientes.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {reminders.map((client) => {
                        const colorClass = getUrgencyColor(client.days_remaining);
                        const urgencyText = getUrgencyText(client.days_remaining);
                        const isOverdue = client.days_remaining < 0;

                        return (
                            <div
                                key={client.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md ${colorClass} ${isOverdue ? 'bg-opacity-100' : 'bg-opacity-60'}`}
                            >
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 align-top">
                                        {isOverdue && (
                                            <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                                        )}
                                        <span className={`font-semibold text-sm truncate max-w-[180px] ${isOverdue ? 'text-red-900' : ''}`} title={client.razon_social}>
                                            {client.razon_social}
                                        </span>
                                    </div>
                                    <span className={`text-xs opacity-80 flex items-center gap-1 ${isOverdue ? 'text-red-800' : ''}`}>
                                        RUC: {client.ruc}
                                    </span>
                                    {isBoss && client.comercial_nombre && (
                                        <div className="flex items-center gap-1 mt-1 text-xs font-medium opacity-90">
                                            <User size={10} />
                                            {client.comercial_nombre}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-200 text-red-800' : ''}`}>
                                        {urgencyText}
                                    </span>
                                    <span className="text-xs opacity-75 mt-0.5">
                                        {format(parseISO(client.proxima_fecha_contacto), "d 'de' MMM", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
