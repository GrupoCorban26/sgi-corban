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

from app.models.whatsapp_bot_config import WhatsAppBotConfig

from app.services.comercial.bot_messages import (
    MSG_BIENVENIDA,
    DEFAULT_NOMBRE_BOT,
    DEFAULT_NOMBRE_EMPRESA,
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

SESSION_TIMEOUT_MINUTES = 10


# ==========================================
# CHATBOT SERVICE
# ==========================================

class ChatbotService:
    def __init__(self, db: AsyncSession, bot_config: WhatsAppBotConfig | None = None):
        self.db = db
        self.bot_config = bot_config

    # --- Helpers multi-bot ---
    @property
    def _bot_name(self) -> str:
        return self.bot_config.nombre_bot if self.bot_config else DEFAULT_NOMBRE_BOT

    @property
    def _empresa_name(self) -> str:
        return self.bot_config.nombre_empresa if self.bot_config else DEFAULT_NOMBRE_EMPRESA

    @property
    def _wa_token(self) -> str | None:
        return self.bot_config.whatsapp_token if self.bot_config else None

    @property
    def _wa_phone_id(self) -> str | None:
        return self.bot_config.whatsapp_phone_id if self.bot_config else None

    @property
    def _bot_config_id(self) -> int | None:
        return self.bot_config.id if self.bot_config else None

    @property
    def _jefe_comercial_id(self) -> int | None:
        return self.bot_config.jefe_comercial_id if self.bot_config else None

    # =====================================================================
    # PUNTO DE ENTRADA PRINCIPAL
    # =====================================================================

    async def process_message(self, data: WhatsAppIncoming, inbox_id: int) -> WhatsAppResponse:
        """Procesa un mensaje entrante y retorna la respuesta del bot."""

        # 1. Normalizar teléfono
        phone = data.from_number.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]

        # 2. Limpieza oportunista de sesiones expiradas
        await self._cleanup_expired_sessions()

        # 3. (La verificación de lead activo se hace en el webhook,
        #     que ya filtra por estado != 'BOT' antes de llegar aquí)

        # 4. Obtener sesión activa del bot
        session = await self._get_active_session(inbox_id)

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
                session = await self._create_session(inbox_id, "MENU")
            elif text_lower:
                # Texto libre sin sesión → crear sesión MENU y mostrar
                # solo la bienvenida con botones. NO derivar automáticamente.
                # El usuario debe elegir una opción del menú.
                session = await self._create_session(inbox_id, "MENU")
                return self._send_menu()
            else:
                # Sin texto y sin botón (ej. sticker solo) → mostrar bienvenida
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

            # Sin intención clara → re-mostrar menú para que elija una opción
            return self._send_menu(es_regreso=True)

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
            await self._update_session(session, "ATENDIDO", {"inbox_id": lead_reciente.id})

            if en_horario:
                # Derivación completamente silenciosa si ya está siendo atendido
                return WhatsAppResponse(action="no_action")
            else:
                texto = MSG_ASESOR_EXISTENTE_FUERA_HORARIO.format(
                    nombre="tu asesor", horario=MSG_HORARIO_INFO
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
                bot_config_id=self._bot_config_id,
                jefe_comercial_id=self._jefe_comercial_id,
            )
            result = await inbox_service.distribute_lead(distribute_data)
            inbox_id = result.get("lead_id")
            nombre_asesor = result.get("assigned_to", {}).get("nombre", "nuestro equipo")

            await self._update_session(session, "ATENDIDO", {"inbox_id": inbox_id})

            if en_horario:
                texto = msg_asignado.format(nombre=nombre_asesor)
                return WhatsAppResponse(
                    action="send_text",
                    messages=[BotMessage(type="text", content=texto)],
                )
            else:
                texto = msg_asignado_fuera.format(
                    nombre=nombre_asesor, horario=MSG_HORARIO_INFO
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
        """Envía mensaje de despedida y limpia la sesión del bot.
        
        Idempotencia: guarda el mensaje en BD PRIMERO (reservando el slot),
        luego envía por WhatsApp. Así si otro worker intenta lo mismo,
        verá el registro existente y se detendrá.
        """
        from app.services.comercial.whatsapp_service import WhatsAppService
        from app.models.chat_message import ChatMessage

        # 1. Verificar si ya se envió despedida reciente (últimos 5 min)
        try:
            limite = datetime.now() - timedelta(minutes=5)
            query_check = select(ChatMessage).where(
                and_(
                    ChatMessage.inbox_id == inbox_id,
                    ChatMessage.direccion == 'SALIENTE',
                    ChatMessage.remitente_tipo == 'BOT',
                    ChatMessage.contenido.contains('Fue un placer atenderte'),
                    ChatMessage.created_at >= limite,
                )
            )
            result_check = await self.db.execute(query_check)
            if result_check.scalars().first():
                logger.info(
                    f"[DESPEDIDA] Ya enviada para inbox_id={inbox_id}. Omitiendo."
                )
                return
        except Exception as e:
            logger.warning(f"Error verificando despedida duplicada: {e}")

        # 2. Eliminar sesión activa si existe
        try:
            session = await self._get_active_session(inbox_id)
            if session:
                await self._delete_session(session)
        except Exception as e:
            logger.warning(f"Error limpiando sesión bot: {e}")

        mensaje = MSG_DESPEDIDA.format(nombre_empresa=self._empresa_name)

        # 3. Guardar en BD PRIMERO (reserva el slot para idempotencia)
        try:
            chat_svc = ChatService(self.db)
            await chat_svc.save_message(ChatMessageCreate(
                inbox_id=inbox_id,
                telefono=phone,
                direccion="SALIENTE",
                remitente_tipo="BOT",
                contenido=mensaje,
                estado_envio="PENDIENTE",
                tipo_contenido="text",
            ))
        except Exception as e:
            logger.error(f"Error guardando despedida en BD: {e}", exc_info=True)
            return

        # 4. Enviar por WhatsApp (si falla, el mensaje ya quedó registrado)
        try:
            await WhatsAppService.send_text(
                phone, mensaje,
                token=self._wa_token, phone_id=self._wa_phone_id,
            )
        except Exception as e:
            logger.error(f"Error enviando despedida por WhatsApp: {e}", exc_info=True)

    # =====================================================================
    # AUTO-DERIVAR SESIONES ABANDONADAS (llamado por scheduler)
    # =====================================================================

    async def auto_derivar_sesiones_abandonadas(self):
        """Busca TODAS las sesiones del bot expiradas y las deriva silenciosamente.

        Aplica para cualquier estado (MENU, COTIZAR_REQUERIMIENTOS, COTIZAR_CONFIRMAR).
        Timeout: SESSION_TIMEOUT_MINUTES (10 min) sin actividad.
        No se envía ningún mensaje al cliente.
        """
        try:
            limite = datetime.now() - timedelta(minutes=SESSION_TIMEOUT_MINUTES)
            query = select(ConversationSession).where(
                and_(
                    ConversationSession.estado.in_([
                        "MENU", "COTIZAR_REQUERIMIENTOS", "COTIZAR_CONFIRMAR"
                    ]),
                    ConversationSession.updated_at <= limite,
                )
            )
            result = await self.db.execute(query)
            sesiones_abandonadas = result.scalars().all()

            for session in sesiones_abandonadas:
                try:
                    # Obtener inbox asociado
                    inbox = await self.db.get(Inbox, session.inbox_id)
                    if not inbox or inbox.ultimo_estado != 'BOT':
                        # Inbox ya fue asignado o no existe → solo limpiar sesión
                        await self.db.delete(session)
                        await self.db.commit()
                        continue

                    phone = inbox.telefono

                    # Resolver bot_config para round-robin por equipo
                    bot_cfg = None
                    if session.bot_config_id:
                        bot_cfg = await self.db.get(WhatsAppBotConfig, session.bot_config_id)
                    _jefe = bot_cfg.jefe_comercial_id if bot_cfg else None
                    _bcid = bot_cfg.id if bot_cfg else None

                    # Contexto según el estado de la sesión
                    datos = self._get_session_data(session)
                    if session.estado in ("COTIZAR_REQUERIMIENTOS", "COTIZAR_CONFIRMAR"):
                        requerimientos = datos.get("requerimientos", [])
                        resumen = "\n".join(f"• {r}" for r in requerimientos) if requerimientos else "Sin detalles"
                        tipo_interes = "COTIZACION"
                        mensaje_ctx = f"Cotización auto-derivada:\n{resumen}"
                    else:
                        tipo_interes = inbox.tipo_interes or "ASESORIA"
                        mensaje_ctx = "Lead auto-derivado (sin respuesta al menú del bot)"

                    # Distribuir vía round-robin
                    inbox_service = InboxService(self.db)
                    distribute_data = InboxDistribute(
                        telefono=phone,
                        mensaje=mensaje_ctx,
                        nombre_display=inbox.nombre_whatsapp or "Cliente WhatsApp",
                        tipo_interes=tipo_interes,
                        bot_config_id=_bcid,
                        jefe_comercial_id=_jefe,
                    )
                    result_dist = await inbox_service.distribute_lead(distribute_data)
                    nombre_asesor = result_dist.get("assigned_to", {}).get("nombre", "un asesor")

                    # Eliminar sesión del bot
                    await self.db.delete(session)
                    await self.db.commit()

                    logger.info(
                        f"[AUTO-DERIVAR] Sesión '{session.estado}' derivada silenciosamente: "
                        f"tel={phone}, asesor={nombre_asesor}"
                    )
                except Exception as e:
                    logger.error(
                        f"[AUTO-DERIVAR] Error derivando sesión {session.id}: {e}",
                        exc_info=True,
                    )
        except Exception as e:
            logger.error(f"[AUTO-DERIVAR] Error general: {e}", exc_info=True)

    # =====================================================================
    # HELPERS
    # =====================================================================

    def _send_menu(self, es_regreso: bool = False) -> WhatsAppResponse:
        """Envía el menú principal con 3 botones."""
        if es_regreso:
            mensaje = MSG_MENU_REGRESO
        else:
            mensaje = MSG_BIENVENIDA.format(nombre_bot=self._bot_name, nombre_empresa=self._empresa_name)
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

    async def _get_active_session(self, inbox_id: int):
        """Obtiene la sesión activa (no expirada) para un inbox."""
        query = select(ConversationSession).where(
            and_(
                ConversationSession.inbox_id == inbox_id,
                or_(
                    ConversationSession.expires_at.is_(None),
                    ConversationSession.expires_at > datetime.now(),
                ),
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _create_session(self, inbox_id: int, estado: str, datos: dict = None):
        """Crea una nueva sesión eliminando cualquier previa para el inbox."""
        existing = await self.db.execute(
            select(ConversationSession).where(ConversationSession.inbox_id == inbox_id)
        )
        for old_session in existing.scalars().all():
            await self.db.delete(old_session)

        expires = None
        if estado != "ATENDIDO":
            expires = datetime.now() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)

        session = ConversationSession(
            inbox_id=inbox_id,
            estado=estado,
            datos=json.dumps(datos) if datos else None,
            expires_at=expires,
            bot_config_id=self._bot_config_id,
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

    # _get_lead_activo eliminado: la verificación de lead activo
    # se realiza en el webhook (whatsapp.py) antes de invocar al bot.
