import { useEffect, useRef } from 'react';
import { useChatConversations } from './useChat';
import { useInboxCount } from './useInboxCount';

export function useDesktopNotifications() {
    // Hacemos polling de los chats y leads del usuario actual
    const { data: conversations = [] } = useChatConversations();
    const { data: inboxCount = 0 } = useInboxCount();

    const previousUnreadMsgsCount = useRef<number>(-1);
    const previousInboxCount = useRef<number>(-1);

    // Initial permission request
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    // Monitor Chat Messages
    useEffect(() => {
        const totalNoLeidos = conversations.reduce((sum, c) => sum + (c.mensajes_no_leidos || 0), 0);
        
        // Disparar notificacion solo si subió respecto a la muestra anterior (omitimos el primer load)
        if (previousUnreadMsgsCount.current !== -1 && totalNoLeidos > previousUnreadMsgsCount.current) {
            const nuevosMensajes = totalNoLeidos - previousUnreadMsgsCount.current;
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Nuevo Mensaje 💬', {
                    body: `Tienes ${nuevosMensajes} nuevo(s) mensaje(s) en tu Bandeja de Chat.`,
                    icon: '/favicon.ico', 
                });
            }
        }
        
        // Actualizar el historial solo después de hacer la comprobación
        if (conversations.length > 0 || previousUnreadMsgsCount.current === -1) {
            previousUnreadMsgsCount.current = totalNoLeidos;
        }
    }, [conversations]);

    // Monitor Leads
    useEffect(() => {
        // Disparar notificacion solo si la cantidad en el buzon creció
        if (previousInboxCount.current !== -1 && inboxCount > previousInboxCount.current) {
            const nuevosLeads = inboxCount - previousInboxCount.current;
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Nuevo Lead Recibido 🎯', {
                    body: `Acaban de entrar ${nuevosLeads} nuevo(s) lead(s) a tu Inbox.`,
                    icon: '/favicon.ico',
                });
            }
        }
        
        if (inboxCount >= 0 || previousInboxCount.current === -1) {
             previousInboxCount.current = inboxCount;
        }
    }, [inboxCount]);
}
