import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Ruta dedicada para exportar reporte de asistencia a Excel.
 * 
 * POST /api/asistencia/exportar → FastAPI POST /administracion/asistencia/exportar-reporte
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ detail: 'No autenticado' }, { status: 401 });
        }

        const horaCorte = req.nextUrl.searchParams.get('hora_corte') || '08:10';

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ detail: 'No se recibió archivo' }, { status: 400 });
        }

        const backendFormData = new FormData();
        backendFormData.append('file', file, file.name);

        const backendUrl = `${API_URL}/administracion/asistencia/exportar-reporte?hora_corte=${encodeURIComponent(horaCorte)}`;

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
                'Content-Type': backendResponse.headers.get('Content-Type') || 'application/octet-stream',
                'Content-Disposition': backendResponse.headers.get('Content-Disposition') || '',
            },
        });
    } catch (error) {
        console.error('[Asistencia Export] Error:', error);
        return NextResponse.json(
            { detail: 'Error al exportar el reporte de asistencia' },
            { status: 500 }
        );
    }
}
