'use server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export interface ActionState {
  error: string | null;
  success?: boolean;
}

export async function handleLoginAction( prevState: ActionState | null, formData: FormData): Promise<ActionState> {

  const correo = formData.get('correo') as string;
  const password = formData.get('password') as string;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ correo, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.detail || "Error al iniciar sesión" }
    }

    const cookieStore = await cookies()
    cookieStore.set('token', data.access_token, {
      httpOnly: true, // Protege contra ataques XSS
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 día
      path: '/',
    })
  }catch (err) {
    return { error: "No se pudo conectar con el servidor" }
  }
  
  redirect('/comercial/')
}