'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    useNotificacionesCount,
    useNotificaciones,
    useNotificacionesActions,
    Notificacion
} from '@/hooks/useNotificaciones';

// Solicitar permiso de notificaciones del navegador
function solicitarPermisoNotificaciones() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Enviar notificación del navegador
function enviarNotificacionNavegador(titulo: string, mensaje: string) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(titulo, {
                body: mensaje,
                icon: '/favicon.ico',
                tag: 'sgi-notificacion', // Evita duplicados
            });
        } catch {
            // Silenciar errores de notificación
        }
    }
}

function tiempoRelativo(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - fecha.getTime()) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 172800) return 'Ayer';
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export default function NotificacionesDropdown() {
    const [abierto, setAbierto] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const prevCountRef = useRef<number>(0);

    const { data: countData } = useNotificacionesCount();
    const { data: listData, refetch: refetchLista } = useNotificaciones();
    const { marcarLeida, marcarTodasLeidas } = useNotificacionesActions();

    const noLeidas = countData?.no_leidas ?? 0;
    const notificaciones = listData?.notificaciones ?? [];

    // Solicitar permiso al montar el componente
    useEffect(() => {
        solicitarPermisoNotificaciones();
    }, []);

    // Detectar nuevas notificaciones y enviar push del navegador
    useEffect(() => {
        if (noLeidas > prevCountRef.current && prevCountRef.current >= 0) {
            // Hay nuevas notificaciones
            const nuevas = notificaciones.filter(n => !n.leida);
            if (nuevas.length > 0) {
                const ultima = nuevas[0];
                enviarNotificacionNavegador(
                    ultima.titulo,
                    ultima.mensaje || 'Tienes una nueva notificación'
                );
            }
        }
        prevCountRef.current = noLeidas;
    }, [noLeidas, notificaciones]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        if (abierto) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [abierto]);

    const handleToggle = () => {
        if (!abierto) {
            refetchLista();
        }
        setAbierto(!abierto);
    };

    const handleClickNotificacion = (n: Notificacion) => {
        if (!n.leida) {
            marcarLeida.mutate(n.id);
        }
        if (n.url_destino) {
            router.push(n.url_destino);
        }
        setAbierto(false);
    };

    const handleMarcarTodas = () => {
        marcarTodasLeidas.mutate();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón campana */}
            <button
                onClick={handleToggle}
                className="p-2 hover:bg-naranja-600 rounded-lg transition-colors relative"
                aria-label="Notificaciones"
            >
                <Bell size={20} />
                {noLeidas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md animate-pulse">
                        {noLeidas > 99 ? '99+' : noLeidas}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {abierto && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-700">
                            Notificaciones
                            {noLeidas > 0 && (
                                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                    {noLeidas} nueva{noLeidas > 1 ? 's' : ''}
                                </span>
                            )}
                        </h3>
                        {noLeidas > 0 && (
                            <button
                                onClick={handleMarcarTodas}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck size={14} />
                                Leer todas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notificaciones.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                No tienes notificaciones
                            </div>
                        ) : (
                            notificaciones.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClickNotificacion(n)}
                                    className={`px-4 py-3 cursor-pointer transition-colors group ${n.leida
                                            ? 'bg-white hover:bg-slate-50'
                                            : 'bg-blue-50/50 hover:bg-blue-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {!n.leida && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                )}
                                                <span className={`text-sm font-medium truncate ${n.leida ? 'text-slate-600' : 'text-slate-800'
                                                    }`}>
                                                    {n.titulo}
                                                </span>
                                            </div>
                                            {n.mensaje && (
                                                <p className={`text-xs mt-0.5 line-clamp-2 ${n.leida ? 'text-slate-400' : 'text-slate-500'
                                                    }`}>
                                                    {n.mensaje}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-[10px] text-slate-400">
                                                {tiempoRelativo(n.created_at)}
                                            </span>
                                            {n.url_destino && (
                                                <ExternalLink size={12} className="text-slate-300 group-hover:text-slate-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
