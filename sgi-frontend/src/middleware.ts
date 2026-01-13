import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/api'];

// Mapeo de ROLES a las rutas que pueden acceder
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
    'ADMIN': ['/administracion', '/sistemas', '/comercial', '/pricing', '/operaciones'],
    'SISTEMAS': ['/sistemas', '/administracion'],
    'GERENCIA': ['/administracion', '/comercial', '/sistemas'],
    'JEFE_COMERCIAL': ['/comercial'],
    'PRICING': ['/pricing', '/comercial'],
    'COMERCIAL': ['/comercial'],
    'OPERACIONES': ['/operaciones'],
    'RRHH': ['/administracion'],
};

// Ruta por defecto para cada rol (a donde redirigir si accede a ruta no permitida)
const ROLE_DEFAULT_PATH: Record<string, string> = {
    'ADMIN': '/administracion',
    'SISTEMAS': '/sistemas',
    'GERENCIA': '/administracion',
    'JEFE_COMERCIAL': '/comercial',
    'PRICING': '/pricing',
    'COMERCIAL': '/comercial',
    'OPERACIONES': '/operaciones',
    'RRHH': '/administracion',
};

interface UserData {
    nombre: string;
    roles: string[];
    area: string;
}

function getUserDataFromCookie(request: NextRequest): UserData | null {
    try {
        const userDataCookie = request.cookies.get('user_data');
        if (!userDataCookie?.value) return null;
        return JSON.parse(userDataCookie.value);
    } catch {
        return null;
    }
}

function getAllowedPaths(roles: string[]): string[] {
    const allowed = new Set<string>();
    for (const role of roles) {
        const paths = ROLE_ALLOWED_PATHS[role] || [];
        paths.forEach(path => allowed.add(path));
    }
    return Array.from(allowed);
}

function getDefaultPath(roles: string[]): string {
    // Retorna la ruta por defecto del primer rol que tenga una
    for (const role of roles) {
        if (ROLE_DEFAULT_PATH[role]) {
            return ROLE_DEFAULT_PATH[role];
        }
    }
    return '/login';
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
            const defaultPath = getDefaultPath(userData.roles);
            console.log(`[MIDDLEWARE] Usuario ya logueado, redirigiendo de /login a ${defaultPath}`);
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
    const allowedPaths = getAllowedPaths(userData.roles);
    const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

    if (!isAllowed) {
        // No tiene permiso -> redirigir a su ruta por defecto
        const defaultPath = getDefaultPath(userData.roles);
        console.log(`[MIDDLEWARE] Usuario sin permiso para ${pathname}, redirigiendo a ${defaultPath}`);
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
