"""Tarea en segundo plano para la ventana de gracia del flujo 'Quiero Cotizar'.

Cuando un cliente envía sus requerimientos, el bot espera 60 segundos sin recibir
nuevos mensajes antes de responder y derivar al asesor. Este módulo maneja esa lógica.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import and_, or_
from sqlalchemy.future import select

from app.database.db_connection import AsyncSessionLocal
from app.models.comercial_session import ConversationSession
from app.models.comercial_inbox import Inbox
from app.models.whatsapp_bot_config import WhatsAppBotConfig
from app.services.comercial.whatsapp_service import WhatsAppService
from app.services.comercial.chatbot_service import (
    COTIZAR_VENTANA_GRACIA_SEGUNDOS,
    ATENDIDO_TIMEOUT_MINUTES
)
from app.services.comercial.inbox_service import InboxService
from app.schemas.comercial.inbox import InboxDistribute
from app.schemas.comercial.chat import ChatMessageCreate
from app.services.comercial.chat_service import ChatService

logger = logging.getLogger(__name__)

# Registro de tareas activas por teléfono para evitar duplicados
_tareas_cotizar: dict[str, asyncio.Task] = {}


async def _ejecutar_ventana_gracia(phone: str, from_number: str, contact_name: str):
    """Espera 60 segundos sin nuevos mensajes y luego deriva al asesor."""
    try:
        while True:
            await asyncio.sleep(COTIZAR_VENTANA_GRACIA_SEGUNDOS)

            # Crear nueva sesión de DB para esta tarea en segundo plano
            async with AsyncSessionLocal() as db:
                # Verificar si la sesión sigue en COTIZAR_PROCESANDO
                query = select(ConversationSession).where(
                    and_(
                        ConversationSession.telefono.like(f"%{phone}%"),
                        ConversationSession.estado == "COTIZAR_PROCESANDO",
                        or_(
                            ConversationSession.expires_at.is_(None),
                            ConversationSession.expires_at > datetime.now()
                        )
                    )
                )
                result = await db.execute(query)
                session = result.scalars().first()

                if not session:
                    logger.info(f"[COTIZAR] Sesión de {phone} ya no existe. Cancelando ventana de gracia.")
                    break

                # Verificar si el último mensaje fue hace más de VENTANA segundos
                datos = json.loads(session.datos) if session.datos else {}
                ultimo_mensaje_str = datos.get("ultimo_mensaje_at")

                if not ultimo_mensaje_str:
                    break

                ultimo_mensaje_at = datetime.fromisoformat(ultimo_mensaje_str)
                segundos_desde_ultimo = (datetime.now() - ultimo_mensaje_at).total_seconds()

                if segundos_desde_ultimo < COTIZAR_VENTANA_GRACIA_SEGUNDOS:
                    # El cliente envió algo recientemente, esperar el tiempo restante
                    tiempo_restante = COTIZAR_VENTANA_GRACIA_SEGUNDOS - segundos_desde_ultimo
                    logger.info(f"[COTIZAR] {phone}: aún hay actividad. Esperando {tiempo_restante:.0f}s más.")
                    await asyncio.sleep(tiempo_restante + 1)
                    continue

                # ¡60 segundos sin mensajes! Derivar al asesor.
                logger.info(f"[COTIZAR] {phone}: ventana de gracia terminada. Derivando al asesor.")

                # MULTI-BOT: resolver credenciales del bot desde la sesión
                bot_cfg = None
                if session.bot_config_id:
                    bot_cfg = await db.get(WhatsAppBotConfig, session.bot_config_id)
                _token = bot_cfg.whatsapp_token if bot_cfg else None
                _phone_id = bot_cfg.whatsapp_phone_id if bot_cfg else None
                _jefe = bot_cfg.jefe_comercial_id if bot_cfg else None
                _bcid = bot_cfg.id if bot_cfg else None

                # Enviar mensaje de confirmación al cliente
                await WhatsAppService.send_text(
                    from_number,
                    "Entiendo estimado, he recibido sus requerimientos, ahora lo derivaré con un asesor 🚀",
                    token=_token, phone_id=_phone_id,
                )

                # Derivar mediante Round Robin
                inbox_service = InboxService(db)
                distribute_data = InboxDistribute(
                    telefono=from_number,
                    mensaje="Solicitud de cotización",
                    nombre_display=contact_name,
                    tipo_interes="COTIZACION",
                    bot_config_id=_bcid,
                    jefe_comercial_id=_jefe,
                )
                result_lead = await inbox_service.distribute_lead(distribute_data)
                nombre_comercial = result_lead["assigned_to"]["nombre"]

                # Enviar mensaje con nombre del asesor asignado
                await WhatsAppService.send_text(
                    from_number,
                    f"El asesor *{nombre_comercial}* se pondrá en contacto contigo en breve. 🚀",
                    token=_token, phone_id=_phone_id,
                )

                # Guardar las respuestas del bot en el historial de chat
                phone_norm = from_number.replace(" ", "").replace("+", "")
                if phone_norm.startswith("51"):
                    phone_norm = phone_norm[2:]
                query_inbox = select(Inbox).where(
                    and_(
                        Inbox.telefono.like(f"%{phone_norm}%"),
                        Inbox.estado.not_in(['CERRADO', 'DESCARTADO'])
                    )
                )
                result_inbox = await db.execute(query_inbox)
                inbox = result_inbox.scalars().first()

                if inbox:
                    chat_svc = ChatService(db)
                    await chat_svc.save_message(ChatMessageCreate(
                        inbox_id=inbox.id,
                        telefono=from_number,
                        direccion='SALIENTE',
                        remitente_tipo='BOT',
                        contenido="Entiendo estimado, he recibido sus requerimientos, ahora lo derivaré con un asesor 🚀",
                        estado_envio='ENVIADO'
                    ))
                    await chat_svc.save_message(ChatMessageCreate(
                        inbox_id=inbox.id,
                        telefono=from_number,
                        direccion='SALIENTE',
                        remitente_tipo='BOT',
                        contenido=f"El asesor *{nombre_comercial}* se pondrá en contacto contigo en breve. 🚀",
                        estado_envio='ENVIADO'
                    ))

                # Obtener inbox_id para poder enlazar mensajes posteriores
                inbox_id = result_lead.get("inbox_id") if result_lead else None
                if not inbox_id and inbox:
                    inbox_id = inbox.id

                # En lugar de eliminar, pasar a ATENDIDO por 5 minutos
                session.estado = "ATENDIDO"
                session.datos = json.dumps({
                    "asesor_nombre": nombre_comercial,
                    "inbox_id": inbox_id
                })
                session.updated_at = datetime.now()
                session.expires_at = datetime.now() + timedelta(minutes=ATENDIDO_TIMEOUT_MINUTES)
                await db.commit()
                break

    except asyncio.CancelledError:
        logger.info(f"[COTIZAR] Tarea de ventana de gracia cancelada para {phone}.")
    except Exception as e:
        logger.error(f"[COTIZAR] Error en ventana de gracia para {phone}: {e}", exc_info=True)
    finally:
        _tareas_cotizar.pop(phone, None)


def iniciar_ventana_gracia(phone: str, from_number: str, contact_name: str):
    """Inicia la tarea en segundo plano para la ventana de gracia.

    Si ya hay una tarea activa para este teléfono, NO la cancela porque
    el temporizador se reinicia automáticamente al verificar el timestamp
    del último mensaje en la base de datos.
    """
    if phone in _tareas_cotizar:
        tarea = _tareas_cotizar[phone]
        if not tarea.done():
            logger.info(f"[COTIZAR] {phone}: tarea ya activa, timestamp actualizado.")
            return

    # Crear nueva tarea
    loop = asyncio.get_event_loop()
    tarea = loop.create_task(_ejecutar_ventana_gracia(phone, from_number, contact_name))
    _tareas_cotizar[phone] = tarea
    logger.info(f"[COTIZAR] {phone}: ventana de gracia iniciada ({COTIZAR_VENTANA_GRACIA_SEGUNDOS}s).")
