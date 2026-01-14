'use server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export interface ActionState {
  error: string | null;
  success?: boolean;
}

export async function handleLoginAction(prevState: any, formData: FormData) {
  const correo = formData.get('correo') as string;
  const password = formData.get('password') as string;

  let targetPath = '';

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login/`, {
      method: 'POST',
      headers: {
        // 2. Cambiamos el Content-Type
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ // <-- ENVIAR COMO STRING
        correo: correo,
        password: password
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (Array.isArray(data.detail)) {
        return { error: data.detail[0].msg };
      }
      return { error: data.detail || "Credenciales incorrectas" };
    }

    // 1. Guardar el token en las cookies (httpOnly para seguridad)
    const cookieStore = await cookies();
    cookieStore.set('token', data.access_token, {
      httpOnly: false, // Permitir acceso desde JavaScript para enviar con axios
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    });

    // 2. Guardar datos del usuario en cookie legible por JS (para el menú)
    cookieStore.set('user_data', JSON.stringify({
      nombre: data.user.nombre,
      roles: data.user.roles,
      area: data.user.area,
    }), {
      httpOnly: false,  // JS puede leer esta cookie
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    });

    // 2. Lógica de Redirección por ROL (prioridad definida)
    // El primer rol que coincida define la ruta
    const ROLE_ROUTES: Record<string, string> = {
      'ADMIN': '/administracion',
      'SISTEMAS': '/sistemas',
      'GERENCIA': '/administracion',
      'JEFE_COMERCIAL': '/comercial',
      'PRICING': '/pricing',
      'COMERCIAL': '/comercial',
      'OPERACIONES': '/operaciones',
      'RRHH': '/administracion',
    };

    const roles: string[] = data.user.roles || [];

    // DEBUG: Ver qué roles llegaron
    console.log('[LOGIN DEBUG] Roles recibidos:', roles);
    console.log('[LOGIN DEBUG] data.user:', data.user);

    // Buscar el primer rol que tenga ruta definida
    for (const role of Object.keys(ROLE_ROUTES)) {
      if (roles.includes(role)) {
        targetPath = ROLE_ROUTES[role];
        console.log('[LOGIN DEBUG] Rol encontrado:', role, '-> redirigiendo a:', targetPath);
        break;
      }
    }

    // Si no coincide ningún rol, usar área como fallback
    if (!targetPath) {
      const area = data.user.area?.toLowerCase().trim() || '';
      if (area.includes('comercial')) targetPath = '/comercial';
      else if (area.includes('administración')) targetPath = '/administracion';
      else if (area.includes('sistemas')) targetPath = '/sistemas';
      else if (area.includes('operaciones')) targetPath = '/operaciones';
      else targetPath = '/dashboard';
    }

  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "No se pudo conectar con el servidor de FastAPI" };
  }

  // 3. Ejecutar la redirección fuera del bloque try-catch
  if (targetPath) {
    redirect(targetPath);
  }

  return { error: "Error inesperado al procesar el acceso" };
}

export async function handleLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('user_data');
  redirect('/login');
}