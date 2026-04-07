'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SGI Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Algo salió mal</h1>
          <p className="text-slate-500">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-azul-800 hover:bg-azul-900 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    </div>
  );
}
