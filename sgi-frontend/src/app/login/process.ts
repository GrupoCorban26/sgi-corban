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

    // 1. Guardar el token en las cookies
    const cookieStore = await cookies();
    cookieStore.set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    });

    // 2. Lógica de Redirección Dinámica
    // Normalizamos el nombre del área (minúsculas y sin espacios extra)
    const area = data.user.area.toLowerCase().trim();

    if (area.includes('comercial')) {
      targetPath = '/comercial';
    }
    else if (area.includes('administración')) {
      targetPath = '/administracion';
    }
    else if (area.includes('sistemas')) {
      targetPath = '/sistemas'
    }
    else if (area.includes('operaciones')) {
      targetPath = '/operaciones';
    }
    else if (area.includes('facturación') || area.includes('facturacion')) {
      targetPath = '/facturacion';
    }
    else {
      // Ruta por defecto si el área no coincide con las anteriores
      targetPath = '/dashboard';
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
  redirect('/login');
}