'use client';

import { useDesktopNotifications } from '@/hooks/comercial/useDesktopNotifications';

export function NotificationManager() {
    // Ejecuta de forma invisible en el fondo la escucha continua de Leads y Chats
    useDesktopNotifications();
    return null;
}
