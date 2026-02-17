
"use client"
import React, { useEffect, useState } from 'react';
import {
  Users, UserPlus, Phone, Briefcase, Smartphone, Settings,
  Building2, Layers, BadgeCheck, Cake, Gift, ChevronRight,
  TrendingUp, Package, ArrowRight, Calendar, Shield
} from "lucide-react";
import Link from 'next/link';
import api from '@/lib/axios';

interface DashboardStats {
  usuarios: number;
  empleados_activos: number;
  empleados_inactivos: number;
  activos_totales: number;
  activos_disponibles: number;
  activos_en_uso: number;
  lineas: {
    total: number;
    disponibles: number;
    asignadas: number;
  };
  estructura: {
    departamentos: number;
    areas: number;
    cargos: number;
  };
  cumpleanos_proximos: Array<{
    id: number;
    nombres: string;
    apellido_paterno: string;
    fecha_nacimiento: string;
    cargo_nombre: string;
    dias_restantes: number;
    dia: number;
    mes: number;
  }>;
  departamentos_distribucion: Array<{
    nombre: string;
    total: number;
  }>;
}

const MONTH_NAMES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  gradient,
  iconBg,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtitle: string;
  gradient: string;
  iconBg: string;
  loading: boolean;
}) {
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

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/organizacion/dashboard/stats');
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalEmpleados = (stats?.empleados_activos ?? 0) + (stats?.empleados_inactivos ?? 0);

  const quickActions = [
    {
      href: '/administracion/organizacion',
      icon: Users,
      label: 'Organización',
      description: 'Departamentos, áreas y colaboradores',
      color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      border: 'hover:border-blue-200',
    },
    {
      href: '/administracion/inventario',
      icon: Package,
      label: 'Inventario',
      description: 'Gestión de activos y equipos',
      color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
      border: 'hover:border-violet-200',
    },
    {
      href: '/administracion/lineas',
      icon: Phone,
      label: 'Líneas',
      description: 'Líneas corporativas y asignaciones',
      color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
      border: 'hover:border-emerald-200',
    },
    {
      href: '/administracion/cumpleanos',
      icon: Cake,
      label: 'Cumpleaños',
      description: 'Calendario de cumpleaños del equipo',
      color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
      border: 'hover:border-pink-200',
    },
    {
      href: '/administracion/asistencias',
      icon: Calendar,
      label: 'Asistencias',
      description: 'Control de asistencia y horarios',
      color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
      border: 'hover:border-amber-200',
    },
    {
      href: '/administracion/rendimiento',
      icon: TrendingUp,
      label: 'Rendimiento',
      description: 'Métricas y evaluaciones',
      color: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
      border: 'hover:border-cyan-200',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-8 py-8 shadow-xl shadow-indigo-200/50">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-indigo-200 text-sm font-medium tracking-wide uppercase">Panel de Administración</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-indigo-100 mt-2 text-base max-w-xl">
            Gestiona tu organización, equipos e infraestructura desde un solo lugar. Aquí tienes un resumen actualizado.
          </p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Empleados Activos"
          value={stats?.empleados_activos ?? 0}
          subtitle={`de ${totalEmpleados} registrados en total`}
          gradient="bg-gradient-to-r from-blue-500 to-blue-400"
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          loading={loading}
        />
        <StatCard
          icon={Smartphone}
          label="Activos en Inventario"
          value={stats?.activos_totales ?? 0}
          subtitle={`${stats?.activos_disponibles ?? 0} disponibles · ${stats?.activos_en_uso ?? 0} en uso`}
          gradient="bg-gradient-to-r from-violet-500 to-violet-400"
          iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
          loading={loading}
        />
        <StatCard
          icon={Phone}
          label="Líneas Corporativas"
          value={stats?.lineas.total ?? 0}
          subtitle={`${stats?.lineas.disponibles ?? 0} libres · ${stats?.lineas.asignadas ?? 0} asignadas`}
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
          iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
          loading={loading}
        />
        <StatCard
          icon={Settings}
          label="Usuarios del Sistema"
          value={stats?.usuarios ?? 0}
          subtitle="Cuentas con acceso al SGI"
          gradient="bg-gradient-to-r from-amber-500 to-amber-400"
          iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
          loading={loading}
        />
      </div>

      {/* ── Main Content Row ── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* ── Upcoming Birthdays ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-xl">
                <Gift className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Próximos Cumpleaños</h3>
                <p className="text-xs text-gray-400">En los próximos 30 días</p>
              </div>
            </div>
            <Link
              href="/administracion/cumpleanos"
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-32 h-3.5 bg-gray-100 rounded" />
                      <div className="w-20 h-3 bg-gray-50 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.cumpleanos_proximos && stats.cumpleanos_proximos.length > 0 ? (
              <ul className="space-y-1">
                {stats.cumpleanos_proximos.map((emp) => (
                  <li
                    key={emp.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${emp.dias_restantes === 0
                        ? 'bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center ${emp.dias_restantes === 0
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                        : 'bg-indigo-50 text-indigo-600'
                      }`}>
                      <span className="text-[10px] font-medium leading-none">{MONTH_NAMES[emp.mes]}</span>
                      <span className="text-sm font-bold leading-tight">{emp.dia}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${emp.dias_restantes === 0 ? 'text-pink-700' : 'text-gray-800'
                        }`}>
                        {emp.nombres} {emp.apellido_paterno}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{emp.cargo_nombre}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${emp.dias_restantes === 0
                        ? 'bg-pink-100 text-pink-700'
                        : emp.dias_restantes <= 3
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                      {emp.dias_restantes === 0 ? '🎉 ¡Hoy!' : `${emp.dias_restantes}d`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Cake className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No hay cumpleaños próximos</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Department Distribution + Structure ── */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* Department Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Colaboradores por Departamento</h3>
                  <p className="text-xs text-gray-400">Distribución del equipo</p>
                </div>
              </div>
              <Link
                href="/administracion/organizacion"
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
              >
                Gestionar <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="w-28 h-3.5 bg-gray-100 rounded" />
                      <div className="w-full h-2 bg-gray-50 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : stats?.departamentos_distribucion && stats.departamentos_distribucion.length > 0 ? (
                <div className="space-y-4">
                  {stats.departamentos_distribucion.map((dept, idx) => {
                    const colors = [
                      'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
                      'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
                      'bg-indigo-500', 'bg-teal-500'
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={dept.nombre} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{dept.nombre}</span>
                          <span className="text-sm font-semibold text-gray-900">{dept.total}</span>
                        </div>
                        <ProgressBar
                          value={dept.total}
                          max={stats.empleados_activos}
                          color={color}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Building2 className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Sin datos de departamentos</p>
                </div>
              )}
            </div>
          </div>

          {/* Organizational Structure Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Building2, label: 'Departamentos', value: stats?.estructura.departamentos ?? 0, bg: 'bg-blue-50', text: 'text-blue-600' },
              { icon: Layers, label: 'Áreas', value: stats?.estructura.areas ?? 0, bg: 'bg-violet-50', text: 'text-violet-600' },
              { icon: BadgeCheck, label: 'Cargos', value: stats?.estructura.cargos ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-600' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow duration-300">
                <div className={`mx-auto w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>
                  <item.icon className={`h-5 w-5 ${item.text}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? <span className="inline-block w-6 h-6 bg-gray-100 rounded animate-pulse" /> : item.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Módulos</h2>
            <p className="text-sm text-gray-400">Accede rápidamente a cada sección del sistema</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className={`group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${action.border}`}>
                <div className={`flex-shrink-0 p-3 rounded-xl transition-colors duration-300 ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-all duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}