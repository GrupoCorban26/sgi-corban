import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Ruta dedicada para uploads de asistencia.
 * Evita el proxy genérico que tiene problemas con multipart/form-data.
 * 
 * POST /api/asistencia/procesar → FastAPI POST /administracion/asistencia/procesar-reporte
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

export async function POST(req: NextRequest) {
    try {
        // Leer token de la cookie httpOnly
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ detail: 'No autenticado' }, { status: 401 });
        }

        // Leer query params
        const horaCorte = req.nextUrl.searchParams.get('hora_corte') || '08:10';

        // Parsear el FormData del request entrante
        const formData = await req.formData();
        const file = formData.get('file');

        console.log('[Asistencia Upload] File received:', file ? `name=${(file as File).name}, size=${(file as File).size}` : 'NULL');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ detail: 'No se recibió archivo' }, { status: 400 });
        }

        // Construir nuevo FormData para enviar al backend
        const backendFormData = new FormData();
        backendFormData.append('file', file, file.name);

        // Enviar al backend FastAPI
        const backendUrl = `${API_URL}/administracion/asistencia/procesar-reporte?hora_corte=${encodeURIComponent(horaCorte)}`;
        console.log(`[Asistencia Upload] Forwarding to: ${backendUrl}`);

        const backendResponse = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: backendFormData,
        });

        const responseBody = await backendResponse.arrayBuffer();

        return new NextResponse(responseBody, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: {
                'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error) {
        console.error('[Asistencia Upload] Error:', error);
        return NextResponse.json(
            { detail: 'Error al procesar el upload de asistencia' },
            { status: 500 }
        );
    }
}
