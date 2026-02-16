
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado, Activo, LineaCorporativa

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth)
):
    """
    Get key statistics for the administration dashboard.
    """
    try:
        # Count usuarios
        res_usuarios = await db.execute(select(func.count()).select_from(Usuario))
        total_usuarios = res_usuarios.scalar() or 0

        # Count empleados activos
        res_empleados = await db.execute(select(func.count()).select_from(Empleado).where(Empleado.is_active == True))
        total_empleados = res_empleados.scalar() or 0

        # Count activos totales
        res_activos = await db.execute(select(func.count()).select_from(Activo))
        total_activos = res_activos.scalar() or 0
        
        # Lineas stats
        res_lineas = await db.execute(select(func.count()).select_from(LineaCorporativa))
        total_lineas = res_lineas.scalar() or 0

        # Lineas disponibles (sin activo)
        res_lineas_disp = await db.execute(select(func.count()).select_from(LineaCorporativa).where(LineaCorporativa.activo_id == None))
        lineas_disponibles = res_lineas_disp.scalar() or 0
        
        return {
            "usuarios": total_usuarios,
            "empleados_activos": total_empleados,
            "activos_totales": total_activos,
            "lineas": {
                "total": total_lineas,
                "disponibles": lineas_disponibles,
                "asignadas": total_lineas - lineas_disponibles
            }
        }
    except Exception as e:
        logger.error(f"Error in dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
