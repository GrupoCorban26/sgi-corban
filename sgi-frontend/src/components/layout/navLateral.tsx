"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // La función que creamos antes
import { MENU_ROLES, type Role } from '@/config/navLateral';
import { handleLogoutAction } from '@/app/login/process';

interface SidebarProps {
  role: Role; // Aquí pasas 'comercial', 'jefa_comercial' o 'pricing'
}

import { useInboxCount } from '@/hooks/comercial/useInboxCount';

export default function Sidebar({ role, isOpen, setIsOpen }: SidebarProps & { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const menuItems = MENU_ROLES[role];
  const { data: inboxCount = 0 } = useInboxCount();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 h-screen bg-azul-900 text-white flex flex-col border-r border-azul-800",
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
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
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative",
                pathname === item.href
                  ? "bg-naranja-500 text-white shadow-lg shadow-naranja-500/20"
                  : "hover:bg-azul-800 text-azul-100"
              )}
            >
              {item.icon && <item.icon size={18} />}
              <span className="font-medium">{item.label}</span>

              {/* Badge for Inbox */}
              {item.href === '/comercial/buzon' && inboxCount > 0 && (
                <span className="absolute right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {inboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-azul-800">
          <form action={handleLogoutAction}>
            <button className="cursor-pointer w-full text-left px-4 py-2 text-sm text-azul-300 hover:text-white">
              Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}