"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // La función que creamos antes
import { MENU_ROLES, type Role } from '@/config/navLateral';

interface SidebarProps {
  role: Role; // Aquí pasas 'comercial', 'jefa_comercial' o 'pricing'
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const menuItems = MENU_ROLES[role];

  return (
    <aside className="w-64 h-screen bg-azul-900 text-white flex flex-col border-r border-azul-800">
      <div className="p-6">
        <h2 className="text-xl font-bold text-naranja-500">SGI Grupo Corban</h2>
        <p className="text-xs text-azul-300 uppercase mt-1">{role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              pathname === item.href 
                ? "bg-naranja-500 text-white shadow-lg shadow-naranja-500/20" 
                : "hover:bg-azul-800 text-azul-100"
            )}
          >
            {/* Aquí iría tu icono */}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-azul-800">
        <button className="w-full text-left px-4 py-2 text-sm text-azul-300 hover:text-white">
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}