"use client";
// Cambiamos 'next/form' por el form normal de HTML
import Image from 'next/image';
import InputLogin from '../../components/ui/input';
import { useActionState } from 'react'
import { handleLoginAction } from './process'

export default function Page() {
  // Inicializamos con un objeto que coincida con ActionState
  const [state, formAction, isPending] = useActionState(handleLoginAction, { error: null });

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Sección Izquierda: Visual (Sin cambios, está perfecta) */}
      <section className="relative hidden md:block w-[60%] lg:w-[65%] overflow-hidden">
        <div className="absolute inset-0 bg-azul-900/90 z-10" />
        <Image
          src="/flota-transportistas.webp"
          alt="Logística Grupo Corban"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center z-20 p-12">
          <h1 className="text-5xl lg:text-6xl font-black text-white text-center leading-tight drop-shadow-lg">
            Sistema de Gestión <br /> 
            <span className="text-naranja-500">Integral</span>
          </h1>
        </div>
      </section>

      {/* Sección Derecha: Formulario */}
      <section className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-12">
          <header className="flex flex-col items-center gap-6">
            <Image 
              src="/logo-corban.png" 
              alt="Grupo Corban" 
              width={320} 
              height={100} 
              className="h-auto w-auto"
            />
            <div className="text-center">
              <h2 className="text-azul-800 font-black uppercase text-3xl tracking-tight">Bienvenido</h2>
            </div>
          </header>

          {/* CAMBIO: Usamos etiqueta form estándar para Server Actions */}
          <form action={formAction} className="space-y-6">
            
            {state?.error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                {state.error}
              </div>
            )}

            <InputLogin 
              label="Correo electrónico" 
              name="correo" 
              type="email" 
              required 
              autoComplete="email" // Mejora UX
            />
            <InputLogin 
              label="Contraseña" 
              name="password" 
              type="password" 
              required 
              autoComplete="current-password" // Mejora UX
            />
            
            <button 
              type="submit"
              disabled={isPending}
              className={`w-full bg-naranja-500 hover:bg-naranja-600 text-white font-bold uppercase py-4 rounded-xl transition-all transform shadow-lg shadow-naranja-500/20 
                ${isPending ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98]"}`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validando...
                </span>
              ) : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}