'use server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isRedirectError } from 'next/dist/client/components/redirect-error'; // Opcional pero recomendado

export interface ActionState {
  error: string | null;
  success?: boolean;
}

export async function handleLoginAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const correo = formData.get('correo') as string;
  const password = formData.get('password') as string;

  let loginExitoso = false;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ correo, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || "Credenciales incorrectas" };
    }

    const cookieStore = await cookies();
    cookieStore.set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 día
      path: '/',
      sameSite: 'lax', // Recomendado para evitar CSRF
    });

    loginExitoso = true;

  } catch (err) {
    // Si el error es una redirección de Next.js, lo dejamos pasar
    if (isRedirectError(err)) throw err;
    
    return { error: "No se pudo conectar con el servidor de FastAPI" };
  }

  // El redirect DEBE estar fuera del try-catch
  if (loginExitoso) {
    redirect('/comercial');
  }

  return { error: "Error inesperado" };
}

export async function handleLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}