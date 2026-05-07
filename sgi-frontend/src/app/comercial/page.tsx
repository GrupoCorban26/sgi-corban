'use client';

import ComercialDashboardContent from '@/components/comercial/ComercialDashboardContent';

export default function ComercialPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ComercialDashboardContent />
      </div>
    </div>
  );
}