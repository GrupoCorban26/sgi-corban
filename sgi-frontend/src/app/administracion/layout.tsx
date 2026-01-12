import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AdministracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}