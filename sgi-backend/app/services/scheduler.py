"""Scheduler para tareas automáticas del sistema.

Incluye:
- Reset matutino de disponibilidad del buzón (8:00 AM PET)
- Asignación automática de leads sin respuesta después de 1 hora
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone, time

from sqlalchemy import update, and_, or_, func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database.db_connection import AsyncSessionLocal
from app.models.seguridad import Usuario, Rol
from app.models.comercial_inbox import Inbox
from app.models.comercial import ClienteContacto, Cliente
from app.models.comercial_session import ConversationSession

logger = logging.getLogger(__name__)

# Zona horaria de Perú (UTC-5)
PET = timezone(timedelta(hours=-5))
HORA_RESET = time(8, 0)  # 8:00 AM

# Configuración de auto-asignación de leads sin respuesta
TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS = 15  # 15 minutos
INTERVALO_VERIFICACION_MINUTOS = 1  # Cada minuto

# Configuración de auto-derivación de cotizaciones abandonadas
INTERVALO_COTIZACIONES_MINUTOS = 1  # Cada cuántos minutos revisar


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


async def _asignar_leads_sin_respuesta():
    """Asigna un asesor a leads con estado NUEVO sin respuesta después del timeout.
    
    Busca registros en Inbox con:
    - estado = 'NUEVO' (el bot envió bienvenida pero el cliente no respondió)
    - sin asignado_a (no tiene asesor)
    - creado hace más de TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS (15 min)
    
    También busca sesiones de bot activas (MENU, COTIZAR_REQUERIMIENTOS, 
    COTIZAR_CONFIRMAR) con más de 15 min de inactividad.
    
    Los asigna a un asesor por Round Robin SIN enviar mensaje al cliente,
    para que el asesor pueda contactarlos manualmente desde el inbox.
    """
    try:
        async with AsyncSessionLocal() as db:
            limite = datetime.now() - timedelta(minutes=TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS)
            
            # 1. Buscar leads NUEVO sin asesor y con más de 15 min de antigüedad
            query = select(Inbox).where(
                and_(
                    Inbox.estado == 'NUEVO',
                    Inbox.asignado_a.is_(None),
                    Inbox.fecha_recepcion <= limite
                )
            ).order_by(Inbox.fecha_recepcion.asc())
            
            result = await db.execute(query)
            leads_sin_respuesta = list(result.scalars().all())
            
            # 2. Buscar sesiones de bot activas con >15 min de inactividad
            #    (cliente quedó en un flujo del bot pero dejó de interactuar)
            estados_bot_activos = ['MENU', 'COTIZAR_REQUERIMIENTOS', 'COTIZAR_CONFIRMAR']
            query_sessions = select(ConversationSession).where(
                and_(
                    ConversationSession.estado.in_(estados_bot_activos),
                    ConversationSession.updated_at <= limite
                )
            )
            result_sessions = await db.execute(query_sessions)
            sesiones_inactivas = result_sessions.scalars().all()
            
            for session in sesiones_inactivas:
                # Buscar inbox NUEVO asociado a esta sesión
                tel_session = session.telefono.replace(" ", "").replace("+", "")
                if tel_session.startswith("51"):
                    tel_session = tel_session[2:]
                    
                query_inbox_session = select(Inbox).where(
                    and_(
                        Inbox.telefono == tel_session,
                        Inbox.estado == 'NUEVO',
                        Inbox.asignado_a.is_(None)
                    )
                )
                result_inbox_s = await db.execute(query_inbox_session)
                inbox_session = result_inbox_s.scalars().first()
                
                if inbox_session and inbox_session not in leads_sin_respuesta:
                    leads_sin_respuesta.append(inbox_session)
            
            if not leads_sin_respuesta:
                return
            
            logger.info(
                f"[SCHEDULER] Encontrados {len(leads_sin_respuesta)} leads sin respuesta "
                f"(más de {TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS} min). Asignando asesores..."
            )
            
            # Obtener comerciales activos disponibles
            query_users = select(Usuario).join(Usuario.roles).where(
                and_(
                    Rol.nombre == 'COMERCIAL',
                    Usuario.is_active == True
                )
            ).options(selectinload(Usuario.empleado))
            
            result_users = await db.execute(query_users)
            all_commercials = list(result_users.scalars().all())
            
            if not all_commercials:
                logger.warning("[SCHEDULER] No hay comerciales activos para asignar leads sin respuesta.")
                return
            
            # Filtrar por jefe comercial si está configurado
            bot_jefe_id_str = os.getenv("BOT_JEFE_COMERCIAL_ID")
            if bot_jefe_id_str:
                try:
                    jefe_id_val = int(bot_jefe_id_str)
                    filtered = [c for c in all_commercials if c.empleado and c.empleado.jefe_id == jefe_id_val]
                    if filtered:
                        all_commercials = filtered
                except ValueError:
                    pass
            
            # Preferir disponibles en buzón, fallback a todos
            disponibles = [c for c in all_commercials if c.disponible_buzon]
            pool = disponibles if disponibles else all_commercials
            pool_sorted = sorted(pool, key=lambda u: u.id)
            
            # Obtener el último lead asignado para continuar el Round Robin
            last_assigned_query = select(Inbox).where(
                Inbox.asignado_a.isnot(None)
            ).order_by(Inbox.id.desc()).limit(1)
            last_result = await db.execute(last_assigned_query)
            last_lead = last_result.scalar_one_or_none()
            
            commercial_ids = [c.id for c in pool_sorted]
            if last_lead and last_lead.asignado_a in commercial_ids:
                next_index = (commercial_ids.index(last_lead.asignado_a) + 1) % len(pool_sorted)
            else:
                next_index = 0
            
            # Asignar cada lead a un asesor (Round Robin)
            asignados = 0
            for lead in leads_sin_respuesta:
                asesor = pool_sorted[next_index]
                
                # Verificar si el cliente aún tiene una sesión activa del bot
                # (aún está interactuando, no interrumpir)
                query_session_activa = select(ConversationSession).where(
                    and_(
                        ConversationSession.telefono.like(f"%{lead.telefono}%"),
                        or_(
                            ConversationSession.expires_at.is_(None),
                            ConversationSession.expires_at > datetime.now()
                        )
                    )
                )
                result_session = await db.execute(query_session_activa)
                if result_session.scalars().first():
                    # Cliente aún en conversación activa con el bot, no interrumpir
                    continue
                
                # Verificar si el teléfono ya tiene un lead PENDIENTE asignado
                # (pudo haber sido asignado manualmente entre tanto)
                query_existente = select(Inbox).where(
                    and_(
                        Inbox.telefono == lead.telefono,
                        Inbox.estado == 'PENDIENTE',
                        Inbox.asignado_a.isnot(None)
                    )
                )
                result_existente = await db.execute(query_existente)
                if result_existente.scalars().first():
                    # Ya tiene un lead asignado, saltar
                    continue
                
                lead.asignado_a = asesor.id
                lead.estado = 'PENDIENTE'
                lead.fecha_asignacion = datetime.now()
                lead.modo = 'ASESOR'  # Modo ASESOR para que el asesor pueda responder directamente
                lead.tipo_interes = 'SIN_RESPUESTA'
                
                # Limpiar sesiones del bot para este teléfono
                stmt_delete_sessions = select(ConversationSession).where(
                    ConversationSession.telefono.like(f"%{lead.telefono}%")
                )
                result_sessions = await db.execute(stmt_delete_sessions)
                for session in result_sessions.scalars().all():
                    await db.delete(session)
                
                # Actualizar mensaje_inicial si es genérico
                if not lead.mensaje_inicial or lead.mensaje_inicial == "Interacción inicial":
                    lead.mensaje_inicial = "[Auto-asignado] Cliente no respondió al bot después de 15 min"
                
                nombre_asesor = (
                    f"{asesor.empleado.nombres} {asesor.empleado.apellido_paterno}"
                    if asesor.empleado else asesor.correo_corp
                )
                logger.info(
                    f"[SCHEDULER] Lead #{lead.id} (tel: {lead.telefono}) "
                    f"auto-asignado a {nombre_asesor} (ID: {asesor.id}) - Sin mensaje al cliente"
                )
                
                next_index = (next_index + 1) % len(pool_sorted)
                asignados += 1
            
            if asignados > 0:
                await db.commit()
                logger.info(f"[SCHEDULER] {asignados} leads sin respuesta asignados exitosamente.")
    
    except Exception as e:
        logger.error(f"[SCHEDULER] Error asignando leads sin respuesta: {e}", exc_info=True)


async def _calcular_segundos_hasta_hora(hora_objetivo: time) -> float:
    """Calcula los segundos hasta la próxima ocurrencia de la hora objetivo (PET)."""
    ahora = datetime.now(PET)
    objetivo_hoy = datetime.combine(ahora.date(), hora_objetivo, tzinfo=PET)

    if ahora >= objetivo_hoy:
        # Ya pasó la hora hoy, programar para mañana
        objetivo_hoy += timedelta(days=1)

    return (objetivo_hoy - ahora).total_seconds()


async def _scheduler_reset_disponibilidad():
    """Loop que ejecuta el reset de disponibilidad cada día a las 8:00 AM PET."""
    logger.info("[SCHEDULER] Tarea de reset de disponibilidad iniciada.")
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
            logger.info("[SCHEDULER] Tarea de reset de disponibilidad detenida.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error en reset de disponibilidad: {e}", exc_info=True)
            await asyncio.sleep(3600)

async def iniciar_scheduler():
    """Inicia todas las tareas programadas del sistema."""
    logger.info("[SCHEDULER] Iniciando todas las tareas programadas...")
    await asyncio.gather(
        _scheduler_reset_disponibilidad(),
    )
