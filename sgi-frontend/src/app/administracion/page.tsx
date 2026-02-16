
"use client"
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Users, UserPlus, Phone, Briefcase, Smartphone, Settings } from "lucide-react";
import Link from 'next/link';
import api from '@/lib/axios';

interface DashboardStats {
  usuarios: number;
  empleados_activos: number;
  activos_totales: number;
  lineas: {
    total: number;
    disponibles: number;
    asignadas: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground mt-2">Bienvenido al centro de control del SGI. Aquí tienes un resumen de tu organización.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.empleados_activos ?? 0}</div>
            <p className="text-xs text-muted-foreground">Colaboradores registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos Totales</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.activos_totales ?? 0}</div>
            <p className="text-xs text-muted-foreground">Equipos en inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líneas Disponibles</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.lineas.disponibles ?? 0}</div>
            <p className="text-xs text-muted-foreground">De {loading ? "..." : stats?.lineas.total ?? 0} líneas totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Admin</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.usuarios ?? 0}</div>
            <p className="text-xs text-muted-foreground">Cuentas de acceso al sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Link href="/administracion/organizacion/empleados">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
              <UserPlus className="h-6 w-6" />
              <span>Gestionar Empleados</span>
            </Button>
          </Link>

          <Link href="/administracion/inventario/activos">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
              <Briefcase className="h-6 w-6" />
              <span>Inventario de Activos</span>
            </Button>
          </Link>

          <Link href="/administracion/lineas">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
              <Phone className="h-6 w-6" />
              <span>Gestión de Líneas</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}