export const MENU_ROLES = {
  comercial: [
    { label: 'Inicio', href: '/comercial/', icon: 'HomeIcon' },
    { label: 'Base', href: '/comercial/base', icon: 'DatabaseIcon' },
    { label: 'Ordenes', href: '/comercial/ordenes', icon: 'ClipboardIcon' },
    { label: 'Cartera', href: '/comercial/cartera', icon: 'UsersIcon' },
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