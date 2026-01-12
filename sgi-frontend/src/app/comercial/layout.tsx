import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout role="comercial">
      {children}
    </DashboardLayout>
  );
}