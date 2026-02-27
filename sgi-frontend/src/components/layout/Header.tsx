'use client';

import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { UserRoundCog, Bell, LogOut, Menu } from 'lucide-react';
import { handleLogoutAction } from '@/app/login/process';

interface HeaderProps {
    onMenuToggle?: () => void;
}

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

export function Header({ onMenuToggle }: HeaderProps = {}) {
    const userName = getUserFromToken();

    return (
        <header className="flex items-center justify-between bg-naranja-500 text-white gap-4 px-6 py-3 shadow-md">
            {/* Left side - Menu toggle for mobile */}
            <div className="flex items-center gap-2">
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="p-2 md:hidden hover:bg-naranja-600 rounded-lg transition-colors mr-2"
                        aria-label="Toggle menu"
                    >
                        <Menu size={24} />
                    </button>
                )}
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
