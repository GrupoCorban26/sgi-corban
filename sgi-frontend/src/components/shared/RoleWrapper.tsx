'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import React from 'react';

interface RoleWrapperProps {
  /** Roles que tienen permiso para ver el contenido */
  allowed: string[];
  /** Contenido a mostrar si el usuario tiene el rol */
  children: React.ReactNode;
  /** Opcional: contenido alternativo si no tiene permiso */
  fallback?: React.ReactNode;
}

/**
 * Componente wrapper para control de acceso basado en roles.
 * 
 * Uso:
 * ```tsx
 * <RoleWrapper allowed={['ADMIN', 'SUPERVISOR']}>
 *   <button>Eliminar Usuario</button>
 * </RoleWrapper>
 * ```
 * 
 * Con fallback:
 * ```tsx
 * <RoleWrapper allowed={['ADMIN']} fallback={<p>Sin permisos</p>}>
 *   <AdminPanel />
 * </RoleWrapper>
 * ```
 */
export default function RoleWrapper({ allowed, children, fallback = null }: RoleWrapperProps) {
  const { user } = useCurrentUser();

  // Si no hay usuario cargado aún, no mostrar nada (evitar flash)
  if (!user) return null;

  // Verificar si alguno de los roles del usuario está en la lista de permitidos
  const hasPermission = user.roles.some(role => allowed.includes(role));

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
