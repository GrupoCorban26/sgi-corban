"""
Schemas Pydantic para el módulo de procesamiento de reportes de asistencia.
Valida y documenta la respuesta de la API.
"""

from pydantic import BaseModel, Field
from typing import List


class TardanzaDia(BaseModel):
    """Detalle de tardanza en un día específico."""
    fecha: str = Field(..., description="Fecha del día (ej: '2026-02-05')")
    dia_numero: int = Field(..., description="Número de día del mes")
    hora_entrada: str = Field(..., description="Hora de entrada registrada (ej: '08:29')")
    hora_salida: str | None = Field(None, description="Hora de salida registrada (ej: '18:05')")
    minutos_tarde: int = Field(..., description="Minutos de retraso sobre la hora de corte")
    minutos_trabajados: int = Field(0, description="Minutos totales trabajados ese día")


class TardanzaEmpleado(BaseModel):
    """Resumen de tardanzas de un empleado."""
    id_empleado: str = Field(..., description="Código del empleado en el reporte")
    nombre: str = Field(..., description="Nombre completo del empleado")
    total_tardanzas: int = Field(..., description="Cantidad de días con tardanza")
    total_minutos_tarde: int = Field(..., description="Suma total de minutos de tardanza")
    total_minutos_trabajados: int = Field(0, description="Suma total de minutos trabajados en el periodo")
    detalle: List[TardanzaDia] = Field(default_factory=list, description="Lista de días con tardanza")


class AsistenciaReporteResponse(BaseModel):
    """Respuesta del procesamiento del reporte de asistencia."""
    periodo: str = Field(..., description="Periodo del reporte (ej: '2026-02-01 ~ 2026-02-24')")
    hora_corte: str = Field(..., description="Hora de corte utilizada para el cálculo")
    total_empleados: int = Field(..., description="Total de empleados procesados")
    total_con_tardanzas: int = Field(..., description="Empleados que tienen al menos 1 tardanza")
    empleados: List[TardanzaEmpleado] = Field(default_factory=list, description="Lista de empleados con tardanzas")
