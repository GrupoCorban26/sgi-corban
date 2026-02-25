import { LucideIcon, Home, BarChart3, ArrowRightLeft, Users, Database, UserCog, Building2, Package, Cable, Clock } from 'lucide-react';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const MENU_ROLES: Record<string, MenuItem[]> = {
  comercial: [
    { label: 'Inicio', href: '/comercial/', icon: Home },
    { label: 'Base', href: '/comercial/base', icon: Database },
    { label: 'Cartera', href: '/comercial/cartera', icon: Users },
    { label: 'Buzón', href: '/comercial/buzon', icon: Package },
  ],
  administrador: [
    { label: 'Inicio', href: '/administracion/', icon: Home },
    { label: 'Organización', href: '/administracion/organizacion', icon: Building2 },
    { label: 'Inventario', href: '/administracion/inventario', icon: Package },
    { label: 'Líneas', href: '/administracion/lineas', icon: Cable },
    { label: 'Cumpleaños', href: '/administracion/cumpleanos', icon: Users },
    { label: 'Asistencias', href: '/administracion/asistencias', icon: Clock },
    { label: 'Rendimiento', href: '/administracion/rendimiento', icon: BarChart3 },
  ],
  jefa_comercial: [
    { label: 'Inicio', href: '/comercial', icon: Home },
    { label: 'Citas', href: '/comercial/citas', icon: Users },
    { label: 'Cartera Global', href: '/comercial/cartera-global', icon: Database },
    { label: 'Buzón', href: '/comercial/buzon', icon: Package },
  ],
  pricing: [
    { label: 'Inicio', href: '/dashboard', icon: Home },
    { label: 'Tarifario', href: '/tarifas', icon: BarChart3 },
    { label: 'Cotizaciones', href: '/cotizaciones', icon: ArrowRightLeft },
  ],
  sistemas: [
    { label: 'Inicio', href: '/sistemas', icon: Home },
    { label: 'Reportes', href: '/sistemas/reportes', icon: BarChart3 },
    { label: 'Transacciones', href: '/sistemas/transacciones', icon: ArrowRightLeft },
    { label: 'Contactos', href: '/sistemas/contactos', icon: Users },
    { label: 'Base', href: '/sistemas/base', icon: Database },
    { label: 'Usuarios', href: '/sistemas/usuarios', icon: UserCog },
    // Secciones administrativas (SISTEMAS = Super Admin)
    { label: 'Organización', href: '/administracion/organizacion', icon: Building2 },
    { label: 'Inventario', href: '/administracion/inventario', icon: Package },
    { label: 'Líneas', href: '/administracion/lineas', icon: Cable },
    { label: 'Asistencias', href: '/administracion/asistencias', icon: Clock },
  ],
};

export type Role = keyof typeof MENU_ROLES;