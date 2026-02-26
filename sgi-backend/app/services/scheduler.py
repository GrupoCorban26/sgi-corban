"""Scheduler para tareas automáticas del sistema.

Incluye:
- Reset matutino de disponibilidad del buzón (8:00 AM PET)
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone, time

from sqlalchemy import update, and_
from sqlalchemy.future import select

from app.database.db_connection import AsyncSessionLocal
from app.models.seguridad import Usuario, Rol

logger = logging.getLogger(__name__)

# Zona horaria de Perú (UTC-5)
PET = timezone(timedelta(hours=-5))
HORA_RESET = time(8, 0)  # 8:00 AM


async def _reset_disponibilidad_buzon():
    """Resetea disponible_buzon=True para todos los comerciales activos."""
    try:
        async with AsyncSessionLocal() as db:
            # Obtener IDs de usuarios con rol COMERCIAL activos
            query = (
                select(Usuario.id)
                .join(Usuario.roles)
                .where(
                    and_(
                        Rol.nombre == 'COMERCIAL',
                        Usuario.is_active == True
                    )
                )
            )
            result = await db.execute(query)
            comercial_ids = [row[0] for row in result.all()]

            if not comercial_ids:
                logger.info("[SCHEDULER] No hay comerciales activos para resetear.")
                return

            # Actualizar todos a disponible
            stmt = (
                update(Usuario)
                .where(Usuario.id.in_(comercial_ids))
                .values(disponible_buzon=True)
            )
            await db.execute(stmt)
            await db.commit()

            logger.info(
                f"[SCHEDULER] Disponibilidad reseteada para {len(comercial_ids)} comerciales."
            )
    except Exception as e:
        logger.error(f"[SCHEDULER] Error reseteando disponibilidad: {e}", exc_info=True)


async def _calcular_segundos_hasta_hora(hora_objetivo: time) -> float:
    """Calcula los segundos hasta la próxima ocurrencia de la hora objetivo (PET)."""
    ahora = datetime.now(PET)
    objetivo_hoy = datetime.combine(ahora.date(), hora_objetivo, tzinfo=PET)

    if ahora >= objetivo_hoy:
        # Ya pasó la hora hoy, programar para mañana
        objetivo_hoy += timedelta(days=1)

    return (objetivo_hoy - ahora).total_seconds()


async def iniciar_scheduler():
    """Loop infinito que ejecuta el reset de disponibilidad cada día a las 8:00 AM PET."""
    logger.info("[SCHEDULER] Scheduler de disponibilidad iniciado.")
    while True:
        try:
            segundos = await _calcular_segundos_hasta_hora(HORA_RESET)
            hora_actual = datetime.now(PET).strftime("%H:%M:%S")
            logger.info(
                f"[SCHEDULER] Hora actual PET: {hora_actual}. "
                f"Próximo reset en {segundos/3600:.1f} horas."
            )
            await asyncio.sleep(segundos)
            await _reset_disponibilidad_buzon()
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Scheduler de disponibilidad detenido.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error en el scheduler: {e}", exc_info=True)
            # Esperar 1 hora antes de reintentar en caso de error
            await asyncio.sleep(3600)
