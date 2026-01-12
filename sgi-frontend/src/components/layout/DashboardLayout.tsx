import NavLateral from '@/components/layout/navLateral';
import { Header } from '@/components/layout/Header';
import { Role } from '@/config/navLateral';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

function getRoleFromToken(): Role {
    const token = Cookies.get('token');
    if (!token) return 'comercial'; // fallback

    const decoded = jwtDecode<{ rol: Role }>(token);
    return decoded.rol || 'comercial';
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const role = getRoleFromToken();
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
