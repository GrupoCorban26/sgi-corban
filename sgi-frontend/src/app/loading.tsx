'use client';

import { Loader2 } from 'lucide-react';

/**
 * Loading component that displays a centered spinner
 * Used for Suspense boundaries and loading states
 */
export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                <p className="mt-3 text-gray-600 font-medium">Cargando...</p>
            </div>
        </div>
    );
}
