// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // 1. Definimos las rutas protegidas (puedes agregar más aquí luego)
  const isProtectedRoute = 
    pathname.startsWith('/administracion') || 
    pathname.startsWith('/comercial');

  const isLoginRoute = pathname === '/login';

  // CASO A: Intenta entrar a zonas privadas sin token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // CASO B: Ya está logueado e intenta ir al login
  if (isLoginRoute && token) {
    // Si ya está dentro, lo mandamos a una de las páginas principales
    return NextResponse.redirect(new URL('/administracion', request.url))
  }

  return NextResponse.next()
}

// 2. El Matcher: Aquí incluimos todas tus carpetas de negocio
export const config = {
  matcher: [
    '/administracion/:path*',
    '/comercial/:path*',
    '/login'
  ],
}