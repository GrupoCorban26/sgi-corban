import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UserData } from '@/types/usuario';
import { getAllowedPathsForRoles, getDefaultPathForRoles } from '@/config/roles';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/api'];


function getUserDataFromCookie(request: NextRequest): UserData | null {
    try {
        const userDataCookie = request.cookies.get('user_data');
        if (!userDataCookie?.value) return null;
        return JSON.parse(userDataCookie.value);
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token');
    const userData = getUserDataFromCookie(request);

    // 1. Permitir archivos estáticos
    if (pathname.includes('.') || pathname.startsWith('/_next')) {
        return NextResponse.next();
    }

    // 2. Permitir rutas de API
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // 3. Si está en /login y YA está autenticado -> redirigir a su dashboard
    if (pathname === '/login' || pathname === '/login/') {
        if (token && userData && userData.roles && userData.roles.length > 0) {
            const defaultPath = getDefaultPathForRoles(userData.roles);
            return NextResponse.redirect(new URL(defaultPath, request.url));
        }
        // No está logueado, permitir ver login
        return NextResponse.next();
    }

    // 4. Verificar autenticación para rutas protegidas
    if (!token) {
        // No autenticado -> redirigir a login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 5. Verificar datos del usuario
    if (!userData || !userData.roles || userData.roles.length === 0) {
        // Sin datos de usuario válidos -> redirigir a login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 6. Verificar si tiene permiso para la ruta actual
    const allowedPaths = getAllowedPathsForRoles(userData.roles);
    const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

    if (!isAllowed) {
        // No tiene permiso -> redirigir a su ruta por defecto
        const defaultPath = getDefaultPathForRoles(userData.roles);
        return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    // 7. Tiene permiso -> continuar
    return NextResponse.next();
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
