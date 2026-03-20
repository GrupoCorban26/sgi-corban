import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationManager } from '@/components/comercial/NotificationManager';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <NotificationManager />
      {children}
    </DashboardLayout>
  );
}