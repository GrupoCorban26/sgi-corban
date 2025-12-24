import NavLateral from '@/components/layout/navLateral';
import { UserRoundCog } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      <NavLateral role="comercial" />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        <header className='flex items-center justify-end bg-naranja-500 text-white gap-4 p-4'>
          <UserRoundCog />
          <h2 className='font-bold uppercase'>Branco Arguedas</h2>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
}