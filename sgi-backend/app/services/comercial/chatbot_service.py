"""
Servicio del chatbot Corby — Grupo Corban SGI.

Máquina de estados que procesa mensajes entrantes de WhatsApp y retorna
la respuesta apropiada.  El bot NO usa IA generativa; todas las respuestas
son deterministas basadas en botones y detección de intención por keywords.

Estados posibles de sesión:
  MENU                  → Esperando selección del menú principal
  COTIZAR_REQUERIMIENTOS → Esperando texto con requerimientos de cotización
  COTIZAR_CONFIRMAR      → Esperando confirmación "¿eso es todo?"
  ATENDIDO               → Lead asignado a comercial; bot en silencio
"""

import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, delete
from sqlalchemy.orm import selectinload

from app.models.comercial_session import ConversationSession
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario
from app.schemas.comercial.whatsapp import WhatsAppIncoming, WhatsAppResponse, BotMessage
from app.schemas.comercial.inbox import InboxDistribute
from app.services.comercial.inbox_service import InboxService
from app.services.comercial.chat_service import ChatService
from app.schemas.comercial.chat import ChatMessageCreate
from app.utils.horario_laboral import es_horario_laboral

from app.services.comercial.bot_messages import (
    MSG_BIENVENIDA,
    MSG_MENU_REGRESO,
    MENU_BUTTONS,
    MSG_ASESOR_ASIGNADO,
    MSG_ASESOR_ASIGNADO_FUERA_HORARIO,
    MSG_ASESOR_EXISTENTE,
    MSG_ASESOR_EXISTENTE_FUERA_HORARIO,
    MSG_COTIZAR_PEDIR_REQ,
    MSG_COTIZAR_CONFIRMAR,
    MSG_COTIZAR_AGREGAR_MAS,
    MSG_COTIZAR_FALLBACK,
    MSG_COTIZAR_DERIVADO,
    MSG_COTIZAR_DERIVADO_FUERA_HORARIO,
    COTIZAR_CONFIRM_BUTTONS,
    MSG_CARGA_LISTA_ASIGNADO,
    MSG_CARGA_LISTA_ASIGNADO_FUERA_HORARIO,
    MSG_DESPEDIDA,
    MSG_CANCELADO,
    MSG_HORARIO_INFO,
    MSG_ERROR_OCUPADOS,
    MSG_ERROR_INESPERADO,
    KEYWORDS_COTIZACION,
    KEYWORDS_CARGA,
)

logger = logging.getLogger(__name__)

SESSION_TIMEOUT_MINUTES = 30


# ==========================================
# CHATBOT SERVICE
# ==========================================

class ChatbotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =====================================================================
    # PUNTO DE ENTRADA PRINCIPAL
    # =====================================================================

    async def process_message(self, data: WhatsAppIncoming) -> WhatsAppResponse:
        """Procesa un mensaje entrante y retorna la respuesta del bot."""

        # 1. Normalizar teléfono
        phone = data.from_number.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]

        # 2. Limpieza oportunista de sesiones expiradas
        await self._cleanup_expired_sessions()

        # 3. Verificar si tiene un lead activo con asesor asignado
        lead_activo = await self._get_lead_activo(phone)
        if lead_activo and lead_activo.asignado_a:
            # El webhook ya guardó el mensaje en chat; bot no responde
            return WhatsAppResponse(action="no_action", messages=[])

        # 4. Obtener sesión activa del bot
        session = await self._get_active_session(phone)

        # 5. Comandos globales
        text_lower = data.message_text.strip().lower()
        button_id = data.button_id

        if text_lower in ("menu", "menú", "inicio") or button_id == "btn_menu":
            es_regreso = session is not None
            if session:
                await self._delete_session(session)
            return self._send_menu(es_regreso=es_regreso)

        if text_lower in ("cancelar", "salir") or button_id == "btn_cancelar":
            if session:
                await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_CANCELADO)],
            )

        # 6. Si no hay sesión activa
        if not session:
            if button_id in ("btn_asesor", "btn_cotizar", "btn_carga"):
                # Presionó un botón del menú → crear sesión y procesar
                session = await self._create_session(phone, "MENU")
            else:
                # Primera interacción o lead cerrado → mostrar bienvenida
                return self._send_menu()

        # 7. Enrutar según estado actual
        state = session.estado

        try:
            if state == "MENU":
                return await self._handle_menu(session, data, phone)
            elif state == "COTIZAR_REQUERIMIENTOS":
                return await self._handle_cotizar_requerimientos(session, data, phone)
            elif state == "COTIZAR_CONFIRMAR":
                return await self._handle_cotizar_confirmar(session, data, phone)
            elif state == "ATENDIDO":
                # Bot en silencio total: el webhook ya guardó el mensaje
                return WhatsAppResponse(action="no_action", messages=[])
            else:
                # Estado desconocido → resetear
                await self._delete_session(session)
                return self._send_menu()
        except Exception as e:
            logger.error(
                f"Error en chatbot (state={state}, phone={phone}): {e}",
                exc_info=True,
            )
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_ERROR_INESPERADO)],
            )

    # =====================================================================
    # HANDLERS
    # =====================================================================

    async def _handle_menu(self, session, data, phone: str) -> WhatsAppResponse:
        """Maneja la selección del menú principal o texto libre."""
        button_id = data.button_id
        text = data.message_text.strip()

        # --- Selección por botón ---
        if button_id == "btn_asesor":
            return await self._derivar_a_comercial(
                session, data, phone, tipo_interes="ASESORIA",
                mensaje_contexto="Solicita hablar con un asesor",
                msg_asignado=MSG_ASESOR_ASIGNADO,
                msg_asignado_fuera=MSG_ASESOR_ASIGNADO_FUERA_HORARIO,
            )

        if button_id == "btn_cotizar":
            await self._update_session(session, "COTIZAR_REQUERIMIENTOS")
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_COTIZAR_PEDIR_REQ)],
            )

        if button_id == "btn_carga":
            return await self._derivar_a_comercial(
                session, data, phone, tipo_interes="CARGA_LISTA",
                mensaje_contexto="Tiene carga lista para operación",
                msg_asignado=MSG_CARGA_LISTA_ASIGNADO,
                msg_asignado_fuera=MSG_CARGA_LISTA_ASIGNADO_FUERA_HORARIO,
            )

        # --- Texto libre: detectar intención por keywords ---
        if text:
            intencion = self._detectar_intencion(text)

            if intencion == "COTIZACION":
                await self._update_session(session, "COTIZAR_REQUERIMIENTOS")
                return WhatsAppResponse(
                    action="send_text",
                    messages=[BotMessage(type="text", content=MSG_COTIZAR_PEDIR_REQ)],
                )

            if intencion == "CARGA":
                return await self._derivar_a_comercial(
                    session, data, phone, tipo_interes="CARGA_LISTA",
                    mensaje_contexto="Tiene carga lista para operación",
                    msg_asignado=MSG_CARGA_LISTA_ASIGNADO,
                    msg_asignado_fuera=MSG_CARGA_LISTA_ASIGNADO_FUERA_HORARIO,
                )

            # Sin intención clara → derivar a comercial
            return await self._derivar_a_comercial(
                session, data, phone, tipo_interes="ASESORIA",
                mensaje_contexto="Solicita hablar con un asesor",
                msg_asignado=MSG_ASESOR_ASIGNADO,
                msg_asignado_fuera=MSG_ASESOR_ASIGNADO_FUERA_HORARIO,
            )

        # Fallback: reenviar menú
        return self._send_menu()

    # ===================== COTIZAR =====================

    async def _handle_cotizar_requerimientos(self, session, data, phone: str) -> WhatsAppResponse:
        """Recibe el primer mensaje de requerimientos y pregunta si es todo."""
        text_lower = data.message_text.strip().lower()

        if text_lower == "volver" or data.button_id == "btn_volver":
            await self._delete_session(session)
            return self._send_menu(es_regreso=True)

        texto = data.message_text.strip()
        if not texto:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_COTIZAR_PEDIR_REQ)],
            )

        # Guardar requerimientos (texto o descripción de multimedia)
        datos = {"requerimientos": [texto]}
        await self._update_session(session, "COTIZAR_CONFIRMAR", datos)

        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=MSG_COTIZAR_CONFIRMAR,
                buttons=COTIZAR_CONFIRM_BUTTONS,
            )],
        )

    async def _handle_cotizar_confirmar(self, session, data, phone: str) -> WhatsAppResponse:
        """Maneja la confirmación de requerimientos o la recepción de más detalles."""
        button_id = data.button_id
        datos = self._get_session_data(session)

        if button_id == "btn_volver":
            await self._delete_session(session)
            return self._send_menu(es_regreso=True)

        # Cliente confirma que terminó → derivar al comercial
        if button_id == "btn_cotizar_listo":
            requerimientos = datos.get("requerimientos", [])
            resumen = "\n".join(f"• {r}" for r in requerimientos)
            mensaje_contexto = f"Solicitud de cotización:\n{resumen}"
            return await self._derivar_a_comercial(
                session, data, phone, tipo_interes="COTIZACION",
                mensaje_contexto=mensaje_contexto,
                msg_asignado=MSG_COTIZAR_DERIVADO,
                msg_asignado_fuera=MSG_COTIZAR_DERIVADO_FUERA_HORARIO,
            )

        # Cliente quiere agregar más detalles (botón)
        if button_id == "btn_cotizar_mas":
            await self._update_session(session, "COTIZAR_CONFIRMAR", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_COTIZAR_AGREGAR_MAS)],
            )

        # Texto libre → el cliente envió más requerimientos
        texto = data.message_text.strip()
        if texto:
            requerimientos = datos.get("requerimientos", [])
            requerimientos.append(texto)
            datos["requerimientos"] = requerimientos
            await self._update_session(session, "COTIZAR_CONFIRMAR", datos)
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(
                    type="buttons",
                    body=MSG_COTIZAR_CONFIRMAR,
                    buttons=COTIZAR_CONFIRM_BUTTONS,
                )],
            )

        # Fallback
        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=MSG_COTIZAR_FALLBACK,
                buttons=COTIZAR_CONFIRM_BUTTONS,
            )],
        )

    # =====================================================================
    # DERIVACIÓN A COMERCIAL (unificada)
    # =====================================================================

    async def _derivar_a_comercial(
        self,
        session,
        data: WhatsAppIncoming,
        phone: str,
        tipo_interes: str,
        mensaje_contexto: str,
        msg_asignado: str,
        msg_asignado_fuera: str,
    ) -> WhatsAppResponse:
        """Asigna un comercial vía round-robin y envía mensaje de confirmación."""

        # Verificar si ya tiene lead pendiente con asesor asignado
        query_inbox = select(Inbox).where(
            and_(Inbox.telefono == phone, Inbox.estado == "PENDIENTE")
        ).order_by(Inbox.id.desc())
        result = await self.db.execute(query_inbox)
        lead_reciente = result.scalars().first()

        en_horario = es_horario_laboral()

        if lead_reciente and lead_reciente.asignado_a:
            # Ya tiene asesor asignado → reconectar
            query_user = (
                select(Usuario)
                .options(selectinload(Usuario.empleado))
                .where(Usuario.id == lead_reciente.asignado_a)
            )
            result_user = await self.db.execute(query_user)
            user = result_user.scalar_one_or_none()
            nombre_comercial = self._get_user_name(user)

            await self._update_session(session, "ATENDIDO", {"inbox_id": lead_reciente.id})

            if en_horario:
                texto = MSG_ASESOR_EXISTENTE.format(nombre=nombre_comercial)
            else:
                texto = MSG_ASESOR_EXISTENTE_FUERA_HORARIO.format(
                    nombre=nombre_comercial, horario=MSG_HORARIO_INFO
                )

            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=texto)],
            )

        # Nuevo lead → distribuir por round-robin
        try:
            inbox_service = InboxService(self.db)
            distribute_data = InboxDistribute(
                telefono=data.from_number,
                mensaje=mensaje_contexto,
                nombre_display=data.contact_name,
                tipo_interes=tipo_interes,
            )
            result = await inbox_service.distribute_lead(distribute_data)
            nombre_comercial = result["assigned_to"]["nombre"]
            inbox_id = result.get("lead_id")

            await self._update_session(session, "ATENDIDO", {"inbox_id": inbox_id})

            if en_horario:
                texto = msg_asignado.format(nombre=nombre_comercial)
            else:
                texto = msg_asignado_fuera.format(
                    nombre=nombre_comercial, horario=MSG_HORARIO_INFO
                )

            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=texto)],
            )
        except Exception as e:
            logger.error(f"Error al derivar a comercial: {e}", exc_info=True)
            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=MSG_ERROR_OCUPADOS)],
            )

    # =====================================================================
    # DESPEDIDA (llamado por inbox_service y chat endpoint al cerrar lead)
    # =====================================================================

    async def send_despedida(self, phone: str, inbox_id: int):
        """Envía mensaje simple de despedida y limpia la sesión del bot."""
        from app.services.comercial.whatsapp_service import WhatsAppService

        # Eliminar sesión activa si existe
        session = await self._get_active_session(phone)
        if session:
            await self._delete_session(session)

        try:
            await WhatsAppService.send_text(phone, MSG_DESPEDIDA)

            # Guardar en historial de chat
            chat_svc = ChatService(self.db)
            await chat_svc.save_message(ChatMessageCreate(
                inbox_id=inbox_id,
                telefono=phone,
                direccion="SALIENTE",
                remitente_tipo="BOT",
                contenido=MSG_DESPEDIDA,
                estado_envio="ENVIADO",
                tipo_contenido="text",
            ))
        except Exception as e:
            logger.error(f"Error enviando despedida: {e}", exc_info=True)

    # =====================================================================
    # AUTO-DERIVAR COTIZACIONES ABANDONADAS (llamado por scheduler)
    # =====================================================================

    async def auto_derivar_cotizaciones_abandonadas(self):
        """Busca sesiones COTIZAR_CONFIRMAR con más de 5 min sin actividad y las deriva."""
        try:
            limite = datetime.now() - timedelta(minutes=5)
            query = select(ConversationSession).where(
                and_(
                    ConversationSession.estado == "COTIZAR_CONFIRMAR",
                    ConversationSession.updated_at <= limite,
                )
            )
            result = await self.db.execute(query)
            sesiones_abandonadas = result.scalars().all()

            for session in sesiones_abandonadas:
                try:
                    phone = session.telefono
                    datos = self._get_session_data(session)
                    requerimientos = datos.get("requerimientos", [])
                    resumen = "\n".join(f"• {r}" for r in requerimientos) if requerimientos else "Cotización sin detalles"

                    # Distribuir lead
                    inbox_service = InboxService(self.db)
                    distribute_data = InboxDistribute(
                        telefono=phone,
                        mensaje=f"Solicitud de cotización (auto-derivada):\n{resumen}",
                        nombre_display="Cliente WhatsApp",
                        tipo_interes="COTIZACION",
                    )
                    result_dist = await inbox_service.distribute_lead(distribute_data)
                    nombre_comercial = result_dist["assigned_to"]["nombre"]

                    # Enviar mensaje al cliente
                    from app.services.comercial.whatsapp_service import WhatsAppService

                    en_horario = es_horario_laboral()
                    if en_horario:
                        texto = MSG_COTIZAR_DERIVADO.format(nombre=nombre_comercial)
                    else:
                        texto = MSG_COTIZAR_DERIVADO_FUERA_HORARIO.format(
                            nombre=nombre_comercial, horario=MSG_HORARIO_INFO
                        )

                    await WhatsAppService.send_text(phone, texto)

                    # Guardar respuesta del bot en historial
                    inbox_id = result_dist.get("lead_id")
                    if inbox_id:
                        chat_svc = ChatService(self.db)
                        await chat_svc.save_message(ChatMessageCreate(
                            inbox_id=inbox_id,
                            telefono=phone,
                            direccion="SALIENTE",
                            remitente_tipo="BOT",
                            contenido=texto,
                            estado_envio="ENVIADO",
                            tipo_contenido="text",
                        ))

                    # Eliminar sesión
                    await self.db.delete(session)
                    await self.db.commit()

                    logger.info(
                        f"[CHATBOT] Cotización auto-derivada: tel={phone}, "
                        f"asesor={nombre_comercial}"
                    )
                except Exception as e:
                    logger.error(
                        f"[CHATBOT] Error auto-derivando cotización {session.telefono}: {e}",
                        exc_info=True,
                    )
        except Exception as e:
            logger.error(f"[CHATBOT] Error en auto_derivar_cotizaciones: {e}", exc_info=True)

    # =====================================================================
    # HELPERS
    # =====================================================================

    def _send_menu(self, es_regreso: bool = False) -> WhatsAppResponse:
        """Envía el menú principal con 3 botones."""
        mensaje = MSG_MENU_REGRESO if es_regreso else MSG_BIENVENIDA
        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(type="buttons", body=mensaje, buttons=MENU_BUTTONS)],
        )

    def _get_user_name(self, user) -> str:
        """Extrae el nombre legible de un Usuario."""
        if user and user.empleado:
            return f"{user.empleado.nombres} {user.empleado.apellido_paterno}"
        elif user:
            return user.correo_corp
        return "Un asesor"

    def _detectar_intencion(self, texto: str) -> str | None:
        """Detecta intención del cliente por palabras clave. Retorna 'COTIZACION', 'CARGA' o None."""
        texto_lower = texto.lower()
        for kw in KEYWORDS_COTIZACION:
            if kw in texto_lower:
                return "COTIZACION"
        for kw in KEYWORDS_CARGA:
            if kw in texto_lower:
                return "CARGA"
        return None

    def _get_session_data(self, session) -> dict:
        """Deserializa el campo JSON 'datos' de la sesión."""
        if session.datos:
            try:
                return json.loads(session.datos)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    async def _guardar_mensaje_en_chat(self, inbox_id: int, telefono: str, texto: str):
        """Guarda un mensaje del cliente en el historial del inbox."""
        if not texto:
            return
        try:
            chat_svc = ChatService(self.db)
            await chat_svc.save_message(ChatMessageCreate(
                inbox_id=inbox_id,
                telefono=telefono,
                direccion="ENTRANTE",
                remitente_tipo="CLIENTE",
                contenido=texto,
                estado_envio="RECIBIDO",
            ))
        except Exception as e:
            logger.warning(f"No se pudo guardar mensaje en chat: {e}")

    async def _guardar_mensaje_en_chat_desde_session(
        self, session, telefono: str, texto: str
    ):
        """Guarda mensaje usando inbox_id de los datos de sesión."""
        datos = self._get_session_data(session)
        inbox_id = datos.get("inbox_id")
        if inbox_id:
            await self._guardar_mensaje_en_chat(inbox_id, telefono, texto)

    # =====================================================================
    # SESSION MANAGEMENT
    # =====================================================================

    async def _get_active_session(self, phone: str):
        """Obtiene la sesión activa (no expirada) para un teléfono."""
        query = select(ConversationSession).where(
            and_(
                ConversationSession.telefono == phone,
                or_(
                    ConversationSession.expires_at.is_(None),
                    ConversationSession.expires_at > datetime.now(),
                ),
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _create_session(self, phone: str, estado: str, datos: dict = None):
        """Crea una nueva sesión eliminando cualquier previa para el teléfono."""
        existing = await self.db.execute(
            select(ConversationSession).where(ConversationSession.telefono == phone)
        )
        for old_session in existing.scalars().all():
            await self.db.delete(old_session)

        expires = None
        if estado != "ATENDIDO":
            expires = datetime.now() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)

        session = ConversationSession(
            telefono=phone,
            estado=estado,
            datos=json.dumps(datos) if datos else None,
            expires_at=expires,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def _update_session(self, session, estado: str, datos: dict = None):
        """Actualiza estado y datos de la sesión."""
        session.estado = estado
        if datos is not None:
            session.datos = json.dumps(datos)
        session.updated_at = datetime.now()

        if estado == "ATENDIDO":
            session.expires_at = None  # Sin timeout
        else:
            session.expires_at = datetime.now() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)

        await self.db.commit()

    async def _delete_session(self, session):
        """Elimina una sesión del bot."""
        await self.db.delete(session)
        await self.db.commit()

    async def _cleanup_expired_sessions(self):
        """Elimina sesiones expiradas hace más de 1 hora (limpieza oportunista)."""
        try:
            stmt = delete(ConversationSession).where(
                ConversationSession.expires_at < datetime.now() - timedelta(hours=1)
            )
            await self.db.execute(stmt)
            await self.db.commit()
        except Exception as e:
            logger.warning(f"Error limpiando sesiones expiradas: {e}")

    async def _get_lead_activo(self, phone: str):
        """Busca un lead activo (PENDIENTE o EN_GESTION) para el teléfono."""
        query = (
            select(Inbox)
            .where(
                and_(
                    Inbox.telefono == phone,
                    Inbox.estado.in_(["PENDIENTE", "EN_GESTION"]),
                )
            )
            .order_by(Inbox.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().first()
