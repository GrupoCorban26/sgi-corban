"use client";
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Función utilitaria para combinar clases de Tailwind sin conflictos
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputLoginProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
}

export default function InputLogin({
  label,
  name,
  error,
  success,
  className,
  ...props
}: InputLoginProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          {...props}
          id={name}
          name={name}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          // El placeholder vacío es truco para el CSS :placeholder-shown
          placeholder=" " 
          className={cn(
            "peer w-full px-4 pt-6 pb-2 border-2 rounded-xl bg-white outline-none transition-all duration-200",
            "disabled:bg-gray-50 disabled:text-gray-400",
            error ? "border-red-500" : success ? "border-green-500" : "border-gray-200 focus:border-azul-500",
            className
          )}
        />
        
        <label
          htmlFor={name}
          className={cn(
            "absolute left-4 cursor-text transition-all duration-200",
            // Lógica de flotado: si hay foco o el input no está vacío (usando peer de Tailwind)
            "peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400",
            "peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1",
            "-top-2.5 left-3 text-xs bg-white px-1", // Estado cuando tiene contenido
            error ? "text-red-500" : isFocused ? "text-azul-500" : "text-gray-500"
          )}
        >
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      </div>

      {error && <p className="mt-1 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}