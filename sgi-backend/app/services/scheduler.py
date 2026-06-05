"""Scheduler para tareas automáticas del sistema.

Incluye:
- Reset matutino de disponibilidad del buzón (8:00 AM PET)
- Asignación automática de leads sin respuesta después de 1 hora
- Alertas de documentos operacionales pendientes (9:00 AM PET)
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone, time, date

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
HORA_ALERTAS_DOCUMENTOS = time(9, 0)  # 9:00 AM

# Configuración de auto-asignación de leads sin respuesta
TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS = 10  # 10 minutos
INTERVALO_VERIFICACION_MINUTOS = 1  # Cada minuto

# Configuración de auto-derivación de cotizaciones abandonadas
INTERVALO_COTIZACIONES_MINUTOS = 1  # Cada cuántos minutos revisar

# Umbrales de alerta de documentos (días antes de la fecha límite de documentos)
UMBRALES_ALERTA_DIAS = [10, 6, 3, 2, 1]


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
    """Asigna un asesor a leads BOT sin respuesta después del timeout.
    
    Busca registros en Inbox con:
    - estado = 'BOT' (el bot envió bienvenida pero el cliente no respondió)
    - sin asignado_a (no tiene asesor)
    - creado hace más de TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS
    
    Los asigna a un asesor por Round Robin SIN enviar mensaje al cliente.
    """
    try:
        async with AsyncSessionLocal() as db:
            limite = datetime.now() - timedelta(minutes=TIMEOUT_LEADS_SIN_RESPUESTA_MINUTOS)
            
            # Buscar leads BOT sin asesor y con más de 10 min de antigüedad
            query = select(Inbox).where(
                and_(
                    Inbox.ultimo_estado == 'BOT',
                    Inbox.asignado_a.is_(None),
                    Inbox.created_at <= limite
                )
            ).order_by(Inbox.created_at.asc())
            
            result = await db.execute(query)
            leads_sin_respuesta = list(result.scalars().all())
            
            if not leads_sin_respuesta:
                return
            
            logger.info(
                f"[SCHEDULER] Encontrados {len(leads_sin_respuesta)} leads BOT sin respuesta "
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
                
                # Verificar si aún tiene sesión de bot activa (no expirada)
                query_session_activa = select(ConversationSession).where(
                    and_(
                        ConversationSession.inbox_id == lead.id,
                        or_(
                            ConversationSession.expires_at.is_(None),
                            ConversationSession.expires_at > datetime.now()
                        )
                    )
                )
                result_session = await db.execute(query_session_activa)
                if result_session.scalars().first():
                    # Sesión activa → el auto_derivar_sesiones_abandonadas lo manejará
                    continue
                
                lead.asignado_a = asesor.id
                lead.ultimo_estado = 'PENDIENTE'
                
                if not lead.tipo_interes:
                    lead.tipo_interes = 'SIN_RESPUESTA'
                
                # Limpiar sesiones expiradas del bot para este inbox
                stmt_delete_sessions = select(ConversationSession).where(
                    ConversationSession.inbox_id == lead.id
                )
                result_sessions_del = await db.execute(stmt_delete_sessions)
                for sess in result_sessions_del.scalars().all():
                    await db.delete(sess)
                
                # Registrar en historial
                from app.services.comercial.historial_inbox_service import HistorialInboxService
                historial_svc = HistorialInboxService(db)
                await historial_svc.registrar_cambio(
                    lead.id, estado_nuevo='PENDIENTE', estado_anterior='BOT'
                )
                
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


async def _alertas_documentos_pendientes():
    """
    Verifica seguimientos en EN_OPERACION y envía alertas de documentos pendientes
    según los umbrales configurados (10, 6, 3, 2, 1 días antes de la fecha límite de documentos).
    Solo envía una alerta por umbral por seguimiento (idempotente).
    Envía por correo + WhatsApp (si está configurado).
    """
    try:
        from app.models.seguimiento import (
            Seguimiento, SeguimientoDocumento, SeguimientoAlertaEnviada
        )
        from app.services.comercial.notificacion_operacional_service import NotificacionOperacionalService

        notif_service = NotificacionOperacionalService()

        async with AsyncSessionLocal() as db:
            # Obtener seguimientos en EN_OPERACION con fecha_limite_documentos definida
            query = (
                select(Seguimiento)
                .where(
                    and_(
                        Seguimiento.estado == "EN_OPERACION",
                        Seguimiento.is_active == True,
                        Seguimiento.fecha_limite_documentos.isnot(None)
                    )
                )
            )
            result = await db.execute(query)
            seguimientos = result.scalars().all()

            if not seguimientos:
                return

            hoy = date.today()

            for seg in seguimientos:
                # Calcular días restantes respecto a la fecha límite de documentos
                dias_restantes = (seg.fecha_limite_documentos - hoy).days

                # Obtener documentos pendientes
                query_docs = select(SeguimientoDocumento).where(
                    and_(
                        SeguimientoDocumento.seguimiento_id == seg.id,
                        SeguimientoDocumento.completado == False
                    )
                )
                result_docs = await db.execute(query_docs)
                docs_pendientes = result_docs.scalars().all()

                if not docs_pendientes:
                    # Todos los documentos están completos, no enviar alerta
                    continue

                # Obtener alertas ya enviadas para este seguimiento
                query_alertas = select(SeguimientoAlertaEnviada).where(
                    SeguimientoAlertaEnviada.seguimiento_id == seg.id
                )
                result_alertas = await db.execute(query_alertas)
                alertas_existentes = result_alertas.scalars().all()
                dias_alertados = {a.dias_antes_eta for a in alertas_existentes}

                # Obtener datos del contacto de alerta
                destinatario_email = None
                destinatario_telefono = None
                nombre_contacto = ""
                if seg.contacto_alerta_id:
                    contacto = await db.get(ClienteContacto, seg.contacto_alerta_id)
                    if contacto:
                        destinatario_email = contacto.correo
                        destinatario_telefono = contacto.telefono
                        nombre_contacto = contacto.nombre or ""

                if not destinatario_email and not destinatario_telefono:
                    logger.warning(
                        f"[SCHEDULER-ALERTAS] Seguimiento #{seg.id} no tiene contacto de alerta "
                        f"con correo ni teléfono válido. Saltando."
                    )
                    continue

                # Nombre de documentos pendientes
                nombres_docs = [d.documento_nombre for d in docs_pendientes]
                razon_social = seg.cliente_razon_social
                titulo = seg.titulo

                # Verificar cada umbral
                for umbral in UMBRALES_ALERTA_DIAS:
                    if dias_restantes <= umbral and umbral not in dias_alertados:
                        # Enviar alerta multicanal
                        canal = await notif_service.enviar_alerta_fecha_limite(
                            telefono=destinatario_telefono,
                            correo=destinatario_email,
                            razon_social=razon_social,
                            titulo_embarque=titulo,
                            fecha_limite=seg.fecha_limite_documentos,
                            dias_restantes_limite=max(dias_restantes, 0),
                            fecha_eta=seg.fecha_eta,
                            documentos_pendientes=nombres_docs,
                            nombre_contacto=nombre_contacto
                        )

                        # Solo registrar la alerta si se envió exitosamente por al menos un canal
                        if canal:
                            alerta = SeguimientoAlertaEnviada(
                                seguimiento_id=seg.id,
                                dias_antes_eta=umbral,
                                tipo="ALERTA_PENDIENTES",
                                canal=canal
                            )
                            db.add(alerta)
                            await db.commit()
                            dias_alertados.add(umbral)

                            logger.info(
                                f"[SCHEDULER-ALERTAS] Alerta enviada ({canal}): Seguimiento #{seg.id}, "
                                f"umbral={umbral} días, fecha_limite={seg.fecha_limite_documentos}, "
                                f"docs_pendientes={len(docs_pendientes)}"
                            )

    except Exception as e:
        logger.error(f"[SCHEDULER-ALERTAS] Error en alertas de documentos: {e}", exc_info=True)


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

async def _scheduler_leads_sin_respuesta():
    """Loop que ejecuta la asignación automática de leads sin respuesta."""
    logger.info("[SCHEDULER] Tarea de asignación de leads sin respuesta iniciada.")
    while True:
        try:
            await asyncio.sleep(INTERVALO_VERIFICACION_MINUTOS * 60)
            await _asignar_leads_sin_respuesta()
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Tarea de asignación de leads detenida.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error en asignación de leads: {e}", exc_info=True)
            await asyncio.sleep(60)


async def _scheduler_cotizaciones_abandonadas():
    """Loop que ejecuta la auto-derivación de cotizaciones abandonadas."""
    logger.info("[SCHEDULER] Tarea de derivación de cotizaciones iniciada.")
    from app.services.comercial.chatbot_service import ChatbotService
    
    while True:
        try:
            await asyncio.sleep(INTERVALO_COTIZACIONES_MINUTOS * 60)
            async with AsyncSessionLocal() as db:
                chatbot_svc = ChatbotService(db)
                await chatbot_svc.auto_derivar_sesiones_abandonadas()
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Tarea de derivación de cotizaciones detenida.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error en derivación de cotizaciones: {e}", exc_info=True)
            await asyncio.sleep(60)


async def _scheduler_bases_abandonadas():
    """Loop que ejecuta la liberación de bases abandonadas (1 vez al día)."""
    logger.info("[SCHEDULER] Tarea de liberación de bases abandonadas iniciada.")
    from app.services.comercial.contactos_asignacion_service import ContactosAsignacionService
    
    while True:
        try:
            # Ejecutar a la medianoche PET
            segundos = await _calcular_segundos_hasta_hora(time(0, 0))
            await asyncio.sleep(segundos)
            async with AsyncSessionLocal() as db:
                svc = ContactosAsignacionService(db)
                await svc.liberar_contactos_abandonados()
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Tarea de bases abandonadas detenida.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error liberando bases: {e}", exc_info=True)
            await asyncio.sleep(3600)


async def _scheduler_alertas_documentos():
    """Loop que ejecuta las alertas de documentos pendientes cada día a las 9:00 AM PET."""
    logger.info("[SCHEDULER] Tarea de alertas de documentos operacionales iniciada.")
    while True:
        try:
            segundos = await _calcular_segundos_hasta_hora(HORA_ALERTAS_DOCUMENTOS)
            hora_actual = datetime.now(PET).strftime("%H:%M:%S")
            logger.info(
                f"[SCHEDULER-ALERTAS] Hora actual PET: {hora_actual}. "
                f"Próxima verificación de alertas en {segundos/3600:.1f} horas."
            )
            await asyncio.sleep(segundos)
            await _alertas_documentos_pendientes()
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Tarea de alertas de documentos detenida.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error en alertas de documentos: {e}", exc_info=True)
            await asyncio.sleep(3600)


async def iniciar_scheduler():
    """Inicia todas las tareas programadas del sistema."""
    logger.info("[SCHEDULER] Iniciando todas las tareas programadas...")
    await asyncio.gather(
        _scheduler_reset_disponibilidad(),
        _scheduler_leads_sin_respuesta(),
        _scheduler_cotizaciones_abandonadas(),
        _scheduler_bases_abandonadas(),
        _scheduler_alertas_documentos()
    )
