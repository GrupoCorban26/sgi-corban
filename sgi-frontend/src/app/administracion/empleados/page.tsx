// src/app/administracion/empleados/page.tsx
"use client";
import { useEmpleados } from "@/hooks/useEmpleado";

export default function EmpleadosPage() {
  const { empleados, loading, pagination, setSearch } = useEmpleados();

  if (loading) return <p>Cargando empleados de Corban...</p>;

  return (
    <div>
      <input 
        onChange={(e) => setSearch(e.target.value)} 
        placeholder="Buscar por DNI o Nombre..." 
      />
      
      <table>
        <thead>
          <tr>
            <th>Apellido paterno</th>
            <th>Nombre</th>
          </tr>
        </thead>
        {empleados.map(emp => (
          <tr key={emp.id}>
            <td>{emp.nombres} {emp.apellido_paterno}</td>
            <td>{emp.cargo_nombre}</td>
          </tr>
        ))}
      </table>

      {/* Botones de paginación usando pagination.setPage */}
    </div>
  );
}