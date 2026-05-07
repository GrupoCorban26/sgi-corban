'use client';

import { useState, useEffect } from 'react';
import {
  CalendarPlus, Phone, Users, CalendarCheck,
  ArrowRight, Sparkles
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import api from '@/lib/axios';

import RecordatorioLlamadas from '@/components/comercial/RecordatorioLlamadas';
import UpcomingAppointments from '@/components/comercial/UpcomingAppointments';
import ModalCita from '@/components/comercial/ModalCita';

interface QuickStats {
  clientes_cartera: number;
  llamadas_pendientes: number;
  citas_hoy: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ComercialDashboardContent() {
  const { user } = useCurrentUser();
  const [isCitaOpen, setIsCitaOpen] = useState(false);
  const [stats, setStats] = useState<QuickStats>({ clientes_cartera: 0, llamadas_pendientes: 0, citas_hoy: 0 });

  useEffect(() => {
    if (user) {
      fetchQuickStats();
    }
  }, [user]);

  const fetchQuickStats = async () => {
    try {
      const [statsRes, remindersRes] = await Promise.all([
        api.get('/clientes/stats').catch(() => ({ data: { total_clientes: 0 } })),
        api.get('/clientes/recordatorios', { params: { days: 0 } }).catch(() => ({ data: [] })),
      ]);
      setStats({
        clientes_cartera: statsRes.data?.total_clientes || 0,
        llamadas_pendientes: remindersRes.data?.length || 0,
        citas_hoy: 0,
      });
    } catch {
      // Silent fail
    }
  };

  const firstName = user?.nombre?.split(' ')[0] || 'Comercial';

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Greeting */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-200/50">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-amber-300 animate-pulse" />
              <span className="text-indigo-200 text-sm font-medium capitalize">{getFormattedDate()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, <span className="text-amber-200">{firstName}</span>
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">
              Tu centro de control comercial está listo.
            </p>
          </div>

          <button
            onClick={() => setIsCitaOpen(true)}
            className="group flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <CalendarPlus size={18} />
            <span className="font-semibold text-sm">Agendar Cita</span>
            <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={22} />}
          label="Clientes en Cartera"
          value={stats.clientes_cartera}
          gradient="from-blue-500 to-cyan-500"
          shadowColor="shadow-blue-200/60"
        />
        <StatCard
          icon={<Phone size={22} />}
          label="Llamadas Pendientes Hoy"
          value={stats.llamadas_pendientes}
          gradient="from-amber-500 to-orange-500"
          shadowColor="shadow-amber-200/60"
          highlight={stats.llamadas_pendientes > 0}
        />
        <StatCard
          icon={<CalendarCheck size={22} />}
          label="Citas Programadas"
          value={stats.citas_hoy}
          gradient="from-violet-500 to-purple-500"
          shadowColor="shadow-violet-200/60"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecordatorioLlamadas />
        <UpcomingAppointments />
      </div>

      <ModalCita isOpen={isCitaOpen} onClose={() => setIsCitaOpen(false)} />
    </div>
  );
}

/* ─── Stat Card Component ──────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  shadowColor: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, gradient, shadowColor, highlight }: StatCardProps) {
  return (
    <div className={`group relative bg-white rounded-2xl border border-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${highlight ? 'ring-2 ring-amber-200' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg ${shadowColor} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
      </div>
      {highlight && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}