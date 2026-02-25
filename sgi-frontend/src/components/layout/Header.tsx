'use client';

import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { UserRoundCog, Bell, LogOut } from 'lucide-react';
import { handleLogoutAction } from '@/app/login/process';

interface TokenPayload {
    sub?: string;
    nombre?: string;
    correo_corp?: string;
    exp?: number;
}

function getUserFromToken(): string {
    try {
        const token = Cookies.get('token');
        if (!token) return 'Usuario';

        const decoded = jwtDecode<TokenPayload>(token);
        // Intentar obtener nombre del token, fallback a correo o 'Usuario'
        return decoded.nombre || decoded.correo_corp?.split('@')[0] || decoded.sub || 'Usuario';
    } catch {
        return 'Usuario';
    }
}

export function Header() {
    const userName = getUserFromToken();

    return (
        <header className="flex items-center justify-between bg-naranja-500 text-white gap-4 px-6 py-3 shadow-md">
            {/* Left side - Breadcrumb or title could go here */}
            <div className="flex items-center gap-2">
                {/* Space for future breadcrumbs */}
            </div>

            {/* Right side - User info */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button
                    className="p-2 hover:bg-naranja-600 rounded-lg transition-colors relative"
                    aria-label="Notificaciones"
                >
                    <Bell size={20} />
                </button>

                {/* User */}
                <div className="flex items-center gap-3 pl-4 border-l border-naranja-400">
                    <div className="w-8 h-8 bg-naranja-600 rounded-full flex items-center justify-center">
                        <UserRoundCog size={18} />
                    </div>
                    <div className="hidden sm:block">
                        <h2 className="font-bold text-sm uppercase">{userName}</h2>
                    </div>
                </div>

                {/* Logout */}
                <form action={handleLogoutAction}>
                    <button
                        type="submit"
                        className="p-2 hover:bg-naranja-600 rounded-lg transition-colors cursor-pointer"
                        title="Cerrar sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </form>
            </div>
        </header>
    );
}
