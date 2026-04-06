import axios from 'axios';

/**
 * Instancia centralizada de axios para el SGI.
 * 
 * Todas las peticiones pasan por el proxy de Next.js (/api/proxy/...)
 * que inyecta el token JWT desde una cookie httpOnly.
 * 
 * Esto protege el token contra ataques XSS — el JavaScript del navegador
 * nunca tiene acceso al token.
 */

// El proxy corre en el mismo origen que Next.js, así que usamos ruta relativa
// No setear Content-Type por defecto — axios lo detecta automáticamente:
//   • Objetos JS  → application/json
//   • FormData    → multipart/form-data (con boundary)
const api = axios.create({
    baseURL: '/api/proxy',
});

// Interceptor de respuesta: manejar errores de autenticación y autorización
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (typeof window !== 'undefined') {
            if (status === 401) {
                // Sesión expirada o token inválido → limpiar cookies (incluyendo httpOnly) y redirigir
                fetch('/api/auth/clear-session', { method: 'POST' }).finally(() => {
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                });
            }

            if (status === 403) {
                // Sin permiso → redirigir a página de acceso denegado
                if (window.location.pathname !== '/acceso-denegado') {
                    window.location.href = '/acceso-denegado';
                }
            }
        }

        // Normalizar error para que los componentes reciban estructura consistente
        const normalizedError = {
            status: status || 0,
            message: error.response?.data?.detail || 'Error de conexión con el servidor',
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
        };

        return Promise.reject(normalizedError);
    }
);

export default api;
