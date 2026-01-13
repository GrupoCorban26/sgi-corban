'use client';

import NavLateral from '@/components/layout/navLateral';
import { Header } from '@/components/layout/Header';
import { Role, MENU_ROLES } from '@/config/navLateral';
import Cookies from 'js-cookie';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface UserData {
    nombre: string;
    roles: string[];
    area: string;
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
            console.log('[MENU DEBUG] No se encontró cookie user_data');
            return 'comercial';
        }

        const userData: UserData = JSON.parse(userDataStr);
        const roles = userData.roles || [];

        console.log('[MENU DEBUG] Roles del usuario:', roles);

        // Buscar primer rol que tenga menú definido
        for (const role of roles) {
            const menuRole = ROLE_TO_MENU[role];
            if (menuRole && MENU_ROLES[menuRole]) {
                console.log('[MENU DEBUG] Rol encontrado:', role, '-> menu:', menuRole);
                return menuRole;
            }
        }

        return 'comercial'; // fallback
    } catch (error) {
        console.log('[MENU DEBUG] Error parseando user_data:', error);
        return 'comercial';
    }
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const role = getRoleFromCookie();
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <NavLateral role={role} />

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header />

                <main className="flex-1 relative overflow-y-auto focus:outline-none p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
