import { useEffect, useRef } from 'react';
import api from '@/lib/axios';

/**
 * Hook que mantiene la sesión activa mientras el usuario tenga la pestaña visible.
 * 
 * Envía un ping al backend cada `intervalMinutes` minutos para extender
 * la sesión en BD (sliding expiration de 30 min).
 * 
 * - Se pausa automáticamente cuando la pestaña está en background
 * - Se reanuda al volver a la pestaña y envía ping inmediato
 * - Si el ping falla con 401, el interceptor de axios maneja el redirect a /login
 */
export function useSessionKeepAlive(intervalMinutes: number = 10): void {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const pingSession = async (): Promise<void> => {
            try {
                await api.get('/login/ping');
            } catch {
                // Si falla con 401, el interceptor de axios en lib/axios.ts
                // ya se encarga de limpiar cookies y redirigir a /login.
                // No necesitamos manejar nada aquí.
            }
        };

        const startInterval = (): void => {
            // Limpiar intervalo previo si existe
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            intervalRef.current = setInterval(pingSession, intervalMinutes * 60 * 1000);
        };

        const handleVisibilityChange = (): void => {
            if (document.visibilityState === 'visible') {
                // Al volver a la pestaña, enviar ping inmediato y reiniciar intervalo
                pingSession();
                startInterval();
            } else {
                // Pestaña oculta: pausar pings para no gastar recursos
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        };

        // Iniciar intervalo al montar
        startInterval();

        // Escuchar cambios de visibilidad de la pestaña
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intervalMinutes]);
}
