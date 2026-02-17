
import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, case, and_
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.models.seguridad import Usuario
from app.models.administrativo import (
    Empleado, Activo, LineaCorporativa,
    Departamento, Area, Cargo
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """
    Get key statistics for the administration dashboard.
    Includes: counts, upcoming birthdays, department distribution, asset status.
    """
    try:
        # ── Core counts ──
        res_usuarios = await db.execute(select(func.count()).select_from(Usuario))
        total_usuarios = res_usuarios.scalar() or 0

        res_empleados = await db.execute(
            select(func.count()).select_from(Empleado).where(Empleado.is_active == True)
        )
        total_empleados = res_empleados.scalar() or 0

        res_empleados_inactivos = await db.execute(
            select(func.count()).select_from(Empleado).where(Empleado.is_active == False)
        )
        total_empleados_inactivos = res_empleados_inactivos.scalar() or 0

        res_activos = await db.execute(select(func.count()).select_from(Activo))
        total_activos = res_activos.scalar() or 0

        res_activos_disponibles = await db.execute(
            select(func.count()).select_from(Activo).where(Activo.is_disponible == True)
        )
        activos_disponibles = res_activos_disponibles.scalar() or 0

        # ── Lines stats ──
        res_lineas = await db.execute(select(func.count()).select_from(LineaCorporativa))
        total_lineas = res_lineas.scalar() or 0

        res_lineas_disp = await db.execute(
            select(func.count()).select_from(LineaCorporativa).where(LineaCorporativa.activo_id == None)
        )
        lineas_disponibles = res_lineas_disp.scalar() or 0

        # ── Structure counts ──
        res_deptos = await db.execute(
            select(func.count()).select_from(Departamento).where(Departamento.is_active == True)
        )
        total_deptos = res_deptos.scalar() or 0

        res_areas = await db.execute(
            select(func.count()).select_from(Area).where(Area.is_active == True)
        )
        total_areas = res_areas.scalar() or 0

        res_cargos = await db.execute(
            select(func.count()).select_from(Cargo).where(Cargo.is_active == True)
        )
        total_cargos = res_cargos.scalar() or 0

        # ── Upcoming birthdays (next 30 days) ──
        today = date.today()
        upcoming_birthdays = []

        result_bdays = await db.execute(
            select(
                Empleado.id,
                Empleado.nombres,
                Empleado.apellido_paterno,
                Empleado.fecha_nacimiento,
                Cargo.nombre.label("cargo_nombre")
            )
            .outerjoin(Cargo, Empleado.cargo_id == Cargo.id)
            .where(
                and_(
                    Empleado.is_active == True,
                    Empleado.fecha_nacimiento != None
                )
            )
        )

        for row in result_bdays:
            if row.fecha_nacimiento:
                try:
                    bday_this_year = row.fecha_nacimiento.replace(year=today.year)
                except ValueError:
                    # Feb 29 in non-leap year
                    bday_this_year = row.fecha_nacimiento.replace(year=today.year, day=28)

                if bday_this_year < today:
                    try:
                        bday_this_year = row.fecha_nacimiento.replace(year=today.year + 1)
                    except ValueError:
                        bday_this_year = row.fecha_nacimiento.replace(year=today.year + 1, day=28)

                days_until = (bday_this_year - today).days
                if days_until <= 30:
                    upcoming_birthdays.append({
                        "id": row.id,
                        "nombres": row.nombres,
                        "apellido_paterno": row.apellido_paterno,
                        "fecha_nacimiento": row.fecha_nacimiento.isoformat(),
                        "cargo_nombre": row.cargo_nombre or "Sin cargo",
                        "dias_restantes": days_until,
                        "dia": bday_this_year.day,
                        "mes": bday_this_year.month
                    })

        upcoming_birthdays.sort(key=lambda x: x["dias_restantes"])

        # ── Employees per department (top departments) ──
        dept_result = await db.execute(
            select(
                Departamento.nombre,
                func.count(Empleado.id).label("total")
            )
            .select_from(Empleado)
            .join(Cargo, Empleado.cargo_id == Cargo.id)
            .join(Area, Cargo.area_id == Area.id)
            .join(Departamento, Area.departamento_id == Departamento.id)
            .where(
                and_(
                    Empleado.is_active == True,
                    Departamento.is_active == True
                )
            )
            .group_by(Departamento.nombre)
            .order_by(func.count(Empleado.id).desc())
        )

        departamentos_dist = [
            {"nombre": row.nombre, "total": row.total}
            for row in dept_result
        ]

        return {
            "usuarios": total_usuarios,
            "empleados_activos": total_empleados,
            "empleados_inactivos": total_empleados_inactivos,
            "activos_totales": total_activos,
            "activos_disponibles": activos_disponibles,
            "activos_en_uso": total_activos - activos_disponibles,
            "lineas": {
                "total": total_lineas,
                "disponibles": lineas_disponibles,
                "asignadas": total_lineas - lineas_disponibles
            },
            "estructura": {
                "departamentos": total_deptos,
                "areas": total_areas,
                "cargos": total_cargos
            },
            "cumpleanos_proximos": upcoming_birthdays[:5],
            "departamentos_distribucion": departamentos_dist
        }
    except Exception as e:
        logger.error(f"Error in dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
