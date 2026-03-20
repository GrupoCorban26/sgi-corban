'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getDefaultPathForRoles } from '@/config/roles';

/**
 * Página de Acceso Denegado (403).
 * Se muestra cuando el interceptor de axios detecta un 403 del backend.
 */
export default function AccesoDenegadoPage() {
    const router = useRouter();
    const { user } = useCurrentUser();

    const handleVolver = () => {
        if (user?.roles?.length) {
            const defaultPath = getDefaultPathForRoles(user.roles);
            router.push(defaultPath);
        } else {
            router.push('/login');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icono */}
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                </div>

                {/* Mensaje */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800">Acceso Denegado</h1>
                    <p className="text-slate-500">
                        No tienes los permisos necesarios para acceder a este recurso.
                        Contacta al administrador del sistema si crees que esto es un error.
                    </p>
                </div>

                {/* Botón */}
                <button
                    onClick={handleVolver}
                    className="inline-flex items-center gap-2 bg-azul-800 hover:bg-azul-900 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Volver a mi dashboard
                </button>
            </div>
        </main>
    );
}
