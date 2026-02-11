export const MENU_ROLES = {
  comercial: [
    { label: 'Inicio', href: '/comercial/' },
    { label: 'Base', href: '/comercial/base' },
    { label: 'Cotizaciones', href: '/comercial/cotizaciones' },
    { label: 'Ordenes', href: '/comercial/ordenes' },
    { label: 'Cartera', href: '/comercial/cartera' },
    { label: 'Buzón', href: '/comercial/buzon' },
  ],
  administrador: [
    { label: 'Inicio', href: '/administracion/' },
    { label: 'Organización', href: '/administracion/organizacion' },
    { label: 'Inventario', href: '/administracion/inventario' },
    { label: 'Líneas', href: '/administracion/lineas' },
    { label: 'Cumpleaños', href: '/administracion/cumpleanos' },
    { label: 'Asistencias', href: '/administracion/asistencias' },
    { label: 'Rendimiento', href: '/administracion/rendimiento' },
  ],
  jefa_comercial: [
    { label: 'Inicio', href: '/comercial' },
    { label: 'Reportes', href: '/comercial/reportes' },
    { label: 'Validaciones', href: '/comercial/citas' },
    { label: 'Cartera Global', href: '/comercial/cartera-global' },
    { label: 'Buzón', href: '/comercial/buzon' },
  ],
  pricing: [
    { label: 'Inicio', href: '/dashboard', icon: 'HomeIcon' },
    { label: 'Tarifario', href: '/tarifas', icon: 'PriceIcon' },
    { label: 'Cotizaciones', href: '/cotizaciones', icon: 'FileIcon' },
  ],
  sistemas: [
    { label: 'Inicio', href: '/sistemas', icon: 'HomeIcon' },
    { label: 'Transacciones', href: '/sistemas/transacciones', icon: 'FileIcon' },
    { label: 'Contactos', href: '/sistemas/contactos', icon: 'UserGroupIcon' },
    { label: 'Base', href: '/sistemas/base', icon: 'PriceIcon' },
    { label: 'Usuarios', href: '/sistemas/usuarios', icon: 'FileIcon' },
  ],
} as const;

export type Role = keyof typeof MENU_ROLES;