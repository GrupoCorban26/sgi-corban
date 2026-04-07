export interface DashboardStats {
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
  cumpleanos_proximos: CumpleanosProximo[];
  departamentos_distribucion: DepartamentoDistribucion[];
}

export interface CumpleanosProximo {
  id: number;
  nombres: string;
  apellido_paterno: string;
  fecha_nacimiento: string;
  cargo_nombre: string;
  dias_restantes: number;
  dia: number;
  mes: number;
}

export interface DepartamentoDistribucion {
  nombre: string;
  total: number;
}
