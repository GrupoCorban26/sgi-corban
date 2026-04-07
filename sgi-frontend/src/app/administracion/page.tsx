"use client"

import React, { useEffect, useState } from 'react';
import {
  Users, Phone, Smartphone, Settings, Shield,
  Building2, Layers, BadgeCheck
} from "lucide-react";
import AdminStatCard from './components/AdminStatCard';
import api from '@/lib/axios';
import { DashboardStats } from '@/types/organizacion/dashboard';

// Componentes locales extraídos
import BirthdaysCard from './components/BirthdaysCard';
import DepartmentDistribution from './components/DepartmentDistribution';
import QuickActions from './components/QuickActions';

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
        <AdminStatCard
          icon={Users}
          label="Empleados Activos"
          value={stats?.empleados_activos ?? 0}
          subtitle={`de ${totalEmpleados} registrados en total`}
          gradient="bg-gradient-to-r from-blue-500 to-blue-400"
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          loading={loading}
        />
        <AdminStatCard
          icon={Smartphone}
          label="Activos en Inventario"
          value={stats?.activos_totales ?? 0}
          subtitle={`${stats?.activos_disponibles ?? 0} disponibles · ${stats?.activos_en_uso ?? 0} en uso`}
          gradient="bg-gradient-to-r from-violet-500 to-violet-400"
          iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
          loading={loading}
        />
        <AdminStatCard
          icon={Phone}
          label="Líneas Corporativas"
          value={stats?.lineas.total ?? 0}
          subtitle={`${stats?.lineas.disponibles ?? 0} libres · ${stats?.lineas.asignadas ?? 0} asignadas`}
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
          iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
          loading={loading}
        />
        <AdminStatCard
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
        <BirthdaysCard
          cumpleanos={stats?.cumpleanos_proximos ?? []}
          loading={loading}
        />

        {/* ── Department Distribution + Structure ── */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <DepartmentDistribution
            departamentos={stats?.departamentos_distribucion ?? []}
            empleadosActivos={stats?.empleados_activos ?? 0}
            loading={loading}
          />

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
      <QuickActions />
    </div>
  );
}