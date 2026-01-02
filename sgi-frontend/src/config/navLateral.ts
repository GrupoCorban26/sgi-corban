export const MENU_ROLES = {
  comercial: [
    { label: 'Inicio', href: '/comercial/' },
    { label: 'Base', href: '/comercial/base' },
    { label: 'Cotizaciones', href: '/comercial/cotizaciones' },
    { label: 'Ordenes', href: '/comercial/ordenes' },
    { label: 'Cartera', href: '/comercial/cartera' },
  ],
  administrador: [
    { label: 'Inicio', href: '/administracion/' },
    { label: 'Organización', href: '/administracion/organizacion' },
    { label: 'Inventario', href: '/administracion/inventario' },
    { label: 'Asistencias', href: '/administracion/asistencias' },
    { label: 'Rendimiento', href: '/administracion/rendimiento' },
  ],
  jefa_comercial: [
    { label: 'Inicio', href: '/dashboard', icon: 'HomeIcon' },
    { label: 'Reportes', href: '/reportes', icon: 'ChartIcon' },
    { label: 'Validaciones', href: '/validaciones', icon: 'ShieldIcon' },
    { label: 'Cartera Global', href: '/cartera-global', icon: 'GlobeIcon' },
  ],
  pricing: [
    { label: 'Inicio', href: '/dashboard', icon: 'HomeIcon' },
    { label: 'Tarifario', href: '/tarifas', icon: 'PriceIcon' },
    { label: 'Cotizaciones', href: '/cotizaciones', icon: 'FileIcon' },
  ],
} as const;

export type Role = keyof typeof MENU_ROLES;