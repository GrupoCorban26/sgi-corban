export const MENU_ROLES = {
  comercial: [
    { label: 'Inicio', href: '/comercial/' },
    { label: 'Base', href: '/comercial/base' },
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
    { label: 'Citas', href: '/comercial/citas' },
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
    // Admin sections (SISTEMAS = Super Admin)
    { label: 'Organización', href: '/administracion/organizacion', icon: 'OrgIcon' },
    { label: 'Inventario', href: '/administracion/inventario', icon: 'BoxIcon' },
    { label: 'Líneas', href: '/administracion/lineas', icon: 'LineIcon' },
    { label: 'Asistencias', href: '/administracion/asistencias', icon: 'ClockIcon' },
  ],
} as const;

export type Role = keyof typeof MENU_ROLES;