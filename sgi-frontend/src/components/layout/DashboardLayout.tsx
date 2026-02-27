'use client';

import { useState, useEffect } from 'react';
import NavLateral from '@/components/layout/navLateral';
import { Header } from '@/components/layout/Header';
import { Role, MENU_ROLES } from '@/config/navLateral';
import Cookies from 'js-cookie';
import type { UserData } from '@/types/usuario';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

// Mapeo de rol del backend a rol del menú
const ROLE_TO_MENU: Record<string, Role> = {
    'ADMIN': 'administrador',
    'SISTEMAS': 'sistemas',
    'GERENCIA': 'administrador',
    'JEFE_COMERCIAL': 'jefa_comercial',
    'PRICING': 'pricing',
    'COMERCIAL': 'comercial',
    'OPERACIONES': 'comercial',
    'RRHH': 'administrador',
};

function getRoleFromCookie(): Role {
    try {
        const userDataStr = Cookies.get('user_data');
        if (!userDataStr) {
            return 'comercial';
        }

        const userData: UserData = JSON.parse(userDataStr);
        const roles = userData.roles || [];

        for (const role of roles) {
            const menuRole = ROLE_TO_MENU[role];
            if (menuRole && MENU_ROLES[menuRole]) {
                return menuRole;
            }
        }

        return 'comercial';
    } catch (error) {
        return 'comercial';
    }
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [role, setRole] = useState<Role | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        setRole(getRoleFromCookie());
    }, []);

    // Mostrar loading mientras se determina el rol (evita hydration mismatch)
    if (role === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <NavLateral role={role} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden w-full">
                <Header onMenuToggle={() => setIsSidebarOpen(true)} />

                <main className="flex-1 relative overflow-y-auto focus:outline-none p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

