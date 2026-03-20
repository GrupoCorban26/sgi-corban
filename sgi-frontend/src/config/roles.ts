/**
 * Configuración centralizada de roles y rutas del SGI.
 * 
 * Fuente única de verdad para:
 * - Rutas permitidas por rol (middleware)
 * - Ruta por defecto por rol (login redirect + middleware fallback)
 * 
 * NOTA: PRICING está definido como placeholder para implementación futura.
 */

export const ROLE_CONFIG: Record<string, { default: string; allowed: string[] }> = {
    ADMIN:          { default: '/administracion', allowed: ['/administracion', '/sistemas/reportes', '/sistemas/reportes-llamadas', '/comercial/analytics'] },
    SISTEMAS:       { default: '/sistemas',       allowed: ['/sistemas', '/administracion', '/comercial'] },
    GERENCIA:       { default: '/administracion', allowed: ['/administracion', '/comercial', '/sistemas/reportes', '/sistemas/reportes-llamadas'] },
    JEFE_COMERCIAL: { default: '/comercial',      allowed: ['/comercial', '/sistemas/reportes', '/sistemas/reportes-llamadas'] },
    PRICING:        { default: '/comercial',      allowed: ['/comercial', '/sistemas/reportes', '/sistemas/reportes-llamadas'] },
    COMERCIAL:      { default: '/comercial',      allowed: ['/comercial'] },
    OPERACIONES:    { default: '/operaciones',    allowed: ['/operaciones'] },
    AUDITOR:        { default: '/sistemas/reportes', allowed: ['/sistemas/reportes', '/sistemas/reportes-llamadas', '/comercial/analytics', '/comercial/leads-web'] },
} as const;

/**
 * Obtiene todas las rutas permitidas para un conjunto de roles.
 */
export function getAllowedPathsForRoles(roles: string[]): string[] {
    const allowed = new Set<string>();
    for (const role of roles) {
        const config = ROLE_CONFIG[role];
        if (config) {
            config.allowed.forEach(path => allowed.add(path));
        }
    }
    return Array.from(allowed);
}

/**
 * Obtiene la ruta por defecto del primer rol que coincida.
 */
export function getDefaultPathForRoles(roles: string[]): string {
    for (const role of Object.keys(ROLE_CONFIG)) {
        if (roles.includes(role) && ROLE_CONFIG[role]) {
            return ROLE_CONFIG[role].default;
        }
    }
    return '/login';
}
