import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SistemasLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}