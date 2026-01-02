import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value // nos quedamos con el valor del token
  const { pathname } = request.nextUrl // nos quedamos con el path: grupocorban.pe/path/path2... -> pathname = path/path2...

  let payload: any = null; 

  // 1. Verificación de Integridad del Token
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      const verified = await jwtVerify(token, secret)
      payload = verified.payload
    } catch (error) {
      const loginRedirect = NextResponse.redirect(new URL('/login', request.url))
      loginRedirect.cookies.delete('token')
      return loginRedirect
    }
  }

  // 2. Si no hay token y quiere ir a rutas privadas, al Login
  const privateModules = ['/comercial', '/administracion', '/operaciones', '/facturacion']
  const isTargetingModule = privateModules.some(prefix => pathname.startsWith(prefix))

  if (isTargetingModule && !payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. VALIDACIÓN DE SEGURIDAD: ¿Coincide su área con la URL?
  if (payload && isTargetingModule) {
    const userArea = (payload.area as string || '').toLowerCase().trim()
    
    // Definimos qué áreas tienen prohibido qué rutas
    // Un usuario de Comercial no puede entrar a nada que no empiece con /comercial
    if (pathname.startsWith('/comercial') && !userArea.includes('comercial')) {
      return redirectToDashboard(userArea, request)
    }

    if (pathname.startsWith('/operaciones') && !userArea.includes('operaciones')) {
      return redirectToDashboard(userArea, request)
    }

    if (pathname.startsWith('/facturacion') && !userArea.includes('facturacion')) {
      return redirectToDashboard(userArea, request)
    }

    // El módulo de administración suele ser para Sistemas y Administración
    if (pathname.startsWith('/administracion') && !userArea.includes('admin')) {
       return redirectToDashboard(userArea, request)
    }

    if (pathname.startsWith('/sistemas') && !userArea.includes('sistemas'))  {
       return redirectToDashboard(userArea, request)
    }
  }

  // 4. Si va al login estando logueado o a la raíz
  if ((pathname === '/login' || pathname === '/') && payload) {
    return redirectToDashboard(payload.area.toLowerCase(), request)
  }

  return NextResponse.next()
}

// Función auxiliar de redirección (se mantiene igual)
function redirectToDashboard(area: string, request: NextRequest) {
  let target = '/login'
  if (area.includes('comercial')) target = '/comercial'
  else if (area.includes('administracion')) target = '/administracion'
  else if (area.includes('sistemas')) target = '/sistemas'
  else if (area.includes('operaciones')) target = '/operaciones'
  else if (area.includes('facturacion')) target = '/facturacion'
  
  if (request.nextUrl.pathname === target) return NextResponse.next()
  return NextResponse.redirect(new URL(target, request.url))
}

export const config = {
  matcher: ['/', '/login', '/comercial/:path*', '/administracion/:path*', '/operaciones/:path*', '/facturacion/:path*'],
}