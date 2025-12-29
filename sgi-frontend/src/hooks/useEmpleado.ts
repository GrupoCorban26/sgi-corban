"use client";
import { useState, useEffect, useCallback } from 'react';
import { empleadoService, Empleado, EmpleadoPagination } from '@/services/empleado';

export function useEmpleados(initialPage = 1, initialPageSize = 10) {
  const [data, setData] = useState<EmpleadoPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Parámetros de búsqueda y paginación
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");

  const fetchEmpleados = useCallback(async () => {
    try {
      setLoading(true);
      const res = await empleadoService.listar(page, initialPageSize, search);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, initialPageSize]);

  // Ejecutar búsqueda cada vez que cambie la página o el texto de búsqueda
  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  return {
    empleados: data?.data || [],
    pagination: {
      total: data?.total || 0,
      totalPages: data?.total_pages || 0,
      currentPage: page,
      setPage
    },
    loading,
    error,
    setSearch,
    refresh: fetchEmpleados // Útil para recargar después de eliminar o crear
  };
}