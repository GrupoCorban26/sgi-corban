import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * API Route para limpiar la cookie httpOnly del token.
 * 
 * Se usa cuando el interceptor de axios detecta un 401 (sesión expirada).
 * Como el token es httpOnly, JavaScript no puede eliminarlo — esta ruta lo hace
 * desde el servidor.
 */
export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete('token');
    cookieStore.delete('user_data');
    return NextResponse.json({ ok: true });
}
