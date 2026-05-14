import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy — Reenvía peticiones del frontend al backend FastAPI.
 * 
 * PROPÓSITO: Permite que el token JWT se almacene en una cookie httpOnly
 * (inaccesible para JavaScript del navegador → protección contra XSS).
 * El proxy lee la cookie en el servidor y la inyecta como header Authorization.
 * 
 * Rutas:
 *   GET  /api/proxy/clientes  → GET  {API_URL}/clientes
 *   POST /api/proxy/login/    → POST {API_URL}/login/
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const targetPath = path.join('/');

    // Archivos estáticos (uploads/) están montados en la raíz del backend,
    // no bajo /api/v1. Usar BACKEND_BASE en vez de API_URL.
    const baseUrl = targetPath.startsWith('uploads/') ? BACKEND_BASE : API_URL;

    // Construir URL destino con query params
    const url = new URL(`${baseUrl}/${targetPath}`);
    req.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
    });

    // Leer token de la cookie httpOnly
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    // Preparar headers — copiar Content-Type y agregar Authorization
    const headers: HeadersInit = {};

    const contentType = req.headers.get('content-type');
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Copiar headers custom del SGI (ej: X-SGI-API-Key)
    const sgiApiKey = req.headers.get('x-sgi-api-key');
    if (sgiApiKey) {
        headers['X-SGI-API-Key'] = sgiApiKey;
    }

    // Reenviar la petición al backend, determinando si hay body
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
    let body: BodyInit | null = null;
    if (hasBody) {
        if (contentType?.includes('multipart/form-data')) {
            // Pasar los bytes crudos directamente — NO usar Blob porque
            // Blob.type convierte a lowercase y corrompe el boundary (case-sensitive)
            const rawBody = await req.arrayBuffer();
            body = rawBody;
            // Mantener Content-Type original en headers (tiene el boundary correcto)
            console.log(`[Proxy] Multipart: ${rawBody.byteLength} bytes`);
        } else {
            body = await req.text();
        }
    }

    console.log(`[Proxy] ${req.method} → ${url.toString()} | Body: ${body ? (typeof body === 'string' ? body.substring(0, 200) : `[binary ${(body as ArrayBuffer).byteLength}b]`) : 'null'}`);

    try {
        const backendResponse = await fetch(url.toString(), {
            method: req.method,
            headers,
            body,
        });

        // Respuesta directa (JSON, etc.)
        const responseBody = await backendResponse.arrayBuffer();

        if (backendResponse.status >= 400) {
            const errorText = new TextDecoder().decode(responseBody);
            console.error(`[Proxy] Backend responded ${backendResponse.status}: ${errorText.substring(0, 500)}`);
        }

        return new NextResponse(responseBody, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: {
                'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error) {
        console.error(`[Proxy] Error connecting to backend: ${url}`, error);
        return NextResponse.json(
            { detail: 'No se pudo conectar con el servidor backend', code: 'PROXY_ERROR' },
            { status: 502 }
        );
    }
}

// Exportar handlers para todos los métodos HTTP
export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context);
}
