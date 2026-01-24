import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Loader2, Phone, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientReminder {
    id: number;
    razon_social: string;
    ruc: string;
    proxima_fecha_contacto: string;
    days_remaining: number;
    telefono: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function RecordatorioLlamadas() {
    const [reminders, setReminders] = useState<ClientReminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchReminders();
    }, []);

    const fetchReminders = async () => {
        try {
            const token = Cookies.get('token');
            const response = await axios.get(`${API_URL}/clientes/recordatorios?days=5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReminders(response.data);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getUrgencyColor = (days: number) => {
        if (days <= 0) return 'bg-red-100 text-red-700 border-red-200';
        if (days === 1) return 'bg-orange-100 text-orange-700 border-orange-200';
        if (days === 2) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (days === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    const getUrgencyText = (days: number) => {
        if (days < 0) return `Venció hace ${Math.abs(days)} días`;
        if (days === 0) return 'Llamar HOY';
        if (days === 1) return 'Mañana';
        return `En ${days} días`;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Phone className="text-indigo-600" size={20} />
                    Recordatorio de Llamadas
                </h3>
                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-500">
                    Próximos 5 días
                </span>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" />
                </div>
            ) : reminders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tienes llamadas pendientes para esta semana.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reminders.map((client) => {
                        const colorClass = getUrgencyColor(client.days_remaining);
                        const urgencyText = getUrgencyText(client.days_remaining);

                        return (
                            <div
                                key={client.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md ${colorClass} bg-opacity-60`}
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm truncate max-w-[200px]" title={client.razon_social}>
                                        {client.razon_social}
                                    </span>
                                    <span className="text-xs opacity-80 flex items-center gap-1">
                                        RUC: {client.ruc}
                                    </span>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        {urgencyText}
                                    </span>
                                    <span className="text-xs opacity-75">
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
