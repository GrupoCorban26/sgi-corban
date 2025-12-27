"use client";
import Form from 'next/form';
import Image from 'next/image';
import InputLogin from '../../components/ui/input';
import { useActionState } from 'react'
import { handleLoginAction } from './process'

export default function Page() {
  // state capturará lo que retorne handleLoginAction (ej: { error: "..." })
  const [state, formAction, isPending] = useActionState(handleLoginAction, null);

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Sección Izquierda: Visual */}
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

          <Form action={formAction} className="space-y-6">
            {/* 1. MOSTRAR ERROR SI EXISTE */}
            {state?.error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                {state.error}
              </div>
            )}

            <InputLogin 
              label="Correo electrónico" 
              name="correo" // CAMBIADO: Coincide con el Backend
              type="email" 
              required 
            />
            <InputLogin 
              label="Contraseña" 
              name="password" 
              type="password" 
              required 
            />
            
            <button 
              type="submit"
              disabled={isPending} // 2. EVITAR DOBLE CLICK
              className={`w-full bg-naranja-500 hover:bg-naranja-600 text-white font-bold uppercase py-4 rounded-xl transition-all transform shadow-lg shadow-naranja-500/20 
                ${isPending ? "opacity-70 cursor-not-allowed scale-100" : "active:scale-[0.98]"}`}
            >
              {/* 3. FEEDBACK VISUAL DE CARGA */}
              {isPending ? "Validando..." : "Iniciar sesión"}
            </button>
          </Form>
        </div>
      </section>
    </main>
  );
}