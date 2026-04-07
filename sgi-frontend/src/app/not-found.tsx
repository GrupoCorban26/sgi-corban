import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-8xl font-bold text-slate-200">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Página no encontrada</h1>
          <p className="text-slate-500">
            La página que buscas no existe o fue movida.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-azul-800 hover:bg-azul-900 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
