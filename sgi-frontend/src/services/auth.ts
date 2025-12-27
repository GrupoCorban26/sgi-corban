// src/services/auth.service.ts

// Next.js reemplazará esto automáticamente por la URL del .env
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const loginService = async (credentials: { correo: string; password: string }) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) {
      // Manejo de errores (401, 403, 500)
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error en el servidor");
    }
    return await response.json();
  } catch (error) {
    throw error;
  } 
};