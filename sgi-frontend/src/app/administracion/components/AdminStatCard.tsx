import React from 'react';

interface AdminStatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtitle: string;
  gradient: string;
  iconBg: string;
  loading: boolean;
}

export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  gradient,
  iconBg,
  loading,
}: AdminStatCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className={`absolute top-0 left-0 right-0 h-1 ${gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-8 bg-gray-100 rounded-lg animate-pulse" />
              ) : value}
            </p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-xl ${iconBg} transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
