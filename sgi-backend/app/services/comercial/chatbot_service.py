import asyncio
import json
import logging
import re
import httpx
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, delete
from sqlalchemy.orm import selectinload

from app.models.comercial_session import ConversationSession
from app.models.comercial_inbox import Inbox
from app.models.comercial import Cliente, ClienteContacto, Cita
from app.models.seguridad import Usuario, Rol
from app.schemas.comercial.whatsapp import WhatsAppIncoming, WhatsAppResponse, BotMessage
from app.schemas.comercial.inbox import InboxDistribute
from app.services.comercial.inbox_service import InboxService
from app.services.comercial.chat_service import ChatService
from app.schemas.comercial.chat import ChatMessageCreate

logger = logging.getLogger(__name__)


# ==========================================
# CONSTANTS
# ==========================================

MENSAJE_BIENVENIDA = "Hola, soy Corby🤖, tu asistente virtual del Grupo Corban. ¿En qué puedo ayudarte hoy?🤗"
MENSAJE_MENU_REGRESO = "¿En qué más puedo ayudarte? 😊"

MENU_BUTTONS = [
    {"id": "btn_asesor", "title": "Hablar con un asesor"},
    {"id": "btn_cotizar", "title": "Quiero cotizar"},
    {"id": "btn_agendar", "title": "Agendar visita"},
]

VISIT_TYPE_BUTTONS = [
    {"id": "btn_nos_visita", "title": "Los visitaré"},
    {"id": "btn_los_visitamos", "title": "Visítenme"},
    {"id": "btn_volver", "title": "⬅️ Volver"},
]

CONFIRM_BUTTONS = [
    {"id": "btn_confirmar", "title": "✅ Confirmar"},
    {"id": "btn_cancelar", "title": "❌ Cancelar"},
    {"id": "btn_volver", "title": "⬅️ Volver"},
]

SESSION_TIMEOUT_MINUTES = 30
ATENDIDO_TIMEOUT_MINUTES = 5
COTIZAR_VENTANA_GRACIA_SEGUNDOS = 60

DIAS_SEMANA = {
    0: "Lunes", 1: "Martes", 2: "Miércoles",
    3: "Jueves", 4: "Viernes",
}


# ==========================================
# FERIADOS PERÚ
# ==========================================

# Feriados fijos (mes, día) - se repiten cada año
FERIADOS_FIJOS = [
    (1, 1),    # Año Nuevo
    (5, 1),    # Día del Trabajo
    (6, 29),   # San Pedro y San Pablo
    (7, 28),   # Fiestas Patrias
    (7, 29),   # Fiestas Patrias
    (8, 6),    # Batalla de Junín
    (8, 30),   # Santa Rosa de Lima
    (10, 8),   # Combate de Angamos
    (11, 1),   # Todos los Santos
    (12, 8),   # Inmaculada Concepción
    (12, 9),   # Batalla de Ayacucho
    (12, 25),  # Navidad
]

# Feriados variables 2026 (Semana Santa - cambian cada año)
FERIADOS_VARIABLES_2026 = [
    date(2026, 4, 9),   # Jueves Santo
    date(2026, 4, 10),  # Viernes Santo
]


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def _es_feriado(fecha: date) -> bool:
    """Check if a date is a Peruvian holiday."""
    if (fecha.month, fecha.day) in FERIADOS_FIJOS:
        return True
    if fecha in FERIADOS_VARIABLES_2026:
        return True
    return False


def _es_dia_habil(fecha: date) -> bool:
    """Check if a date is a business day (not weekend, not holiday)."""
    if fecha.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    if _es_feriado(fecha):
        return False
    return True


def _proximos_dias_habiles(desde: date, cantidad: int = 10) -> list:
    """Get the next N business days starting from a date."""
    dias = []
    current = desde
    while len(dias) < cantidad:
        current += timedelta(days=1)
        if _es_dia_habil(current):
            dias.append(current)
    return dias


def _sanitizar_ruc(texto: str) -> str:
    """Clean RUC input: remove spaces, dashes, dots, 'RUC:' prefix."""
    texto = texto.strip().upper()
    texto = re.sub(r'^RUC[\s:]*', '', texto)
    texto = re.sub(r'[\s\-\.\,]', '', texto)
    return texto


def _sanitizar_razon_social(texto: str) -> str:
    """Clean razón social: remove emojis, limit to 100 chars."""
    texto = re.sub(r'[\U00010000-\U0010ffff]', '', texto, flags=re.UNICODE)
    texto = texto.strip()
    return texto[:100]


# ==========================================
# CHATBOT SERVICE
# ==========================================

class ChatbotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_message(self, data: WhatsAppIncoming) -> WhatsAppResponse:
        """Punto de entrada principal: procesa un mensaje entrante y retorna la respuesta del bot."""

        # 1. Normalizar teléfono
        phone = data.from_number.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]

        # 2. Limpieza de sesiones expiradas (oportunista)
        await self._cleanup_expired_sessions()

        # 3. Obtener sesión activa
        session = await self._get_active_session(phone)

        # 4. Comandos globales
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
                messages=[BotMessage(type="text", content="Operación cancelada. Escribe *menu* cuando quieras volver a empezar. 👋")]
            )

        # 5. Si no hay sesión activa → mensaje de bienvenida con botones
        if not session:
            # Si presionó un botón del menú principal, crear sesión y procesar
            if button_id in ("btn_asesor", "btn_cotizar", "btn_agendar"):
                session = await self._create_session(phone, "MENU")
            else:
                # Cualquier otro mensaje (texto, imagen, audio, lo que sea) → bienvenida
                return self._send_menu()

        # 6. Enrutar según estado actual
        state = session.estado if session else "MENU"

        try:
            if state == "MENU":
                return await self._handle_menu(session, data, phone)
            elif state == "ATENDIDO":
                return await self._handle_atendido(session, data, phone)
            elif state == "COTIZAR_REQUERIMIENTOS":
                return await self._handle_cotizar_requerimientos(session, data, phone)
            elif state == "COTIZAR_PROCESANDO":
                return await self._handle_cotizar_procesando(session, data, phone)
            elif state == "AGENDAR_RUC":
                return await self._handle_agendar_ruc(session, data)
            elif state == "AGENDAR_TIPO":
                return await self._handle_agendar_tipo(session, data)
            elif state == "AGENDAR_UBICACION":
                return await self._handle_agendar_ubicacion(session, data)
            elif state == "AGENDAR_FECHA":
                return await self._handle_agendar_fecha(session, data)
            elif state == "AGENDAR_HORA":
                return await self._handle_agendar_hora(session, data)
            elif state == "AGENDAR_CONFIRMAR":
                return await self._handle_agendar_confirmar(session, data, phone)
            else:
                await self._delete_session(session)
                return self._send_menu()
        except Exception as e:
            logger.error(f"Error en chatbot (state={state}, phone={phone}): {e}", exc_info=True)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Ocurrió un error inesperado. Escribe *menu* para volver a empezar. 🔄")]
            )

    # ===================== MENU HANDLER =====================

    async def _handle_menu(self, session, data, phone):
        """Maneja la selección del menú principal (3 botones)."""
        button_id = data.button_id

        if button_id == "btn_asesor":
            return await self._handle_asesor(session, data, phone)
        elif button_id == "btn_cotizar":
            await self._update_session(session, "COTIZAR_REQUERIMIENTOS")
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Cuénteme estimado, cuales son sus requerimientos😄")]
            )
        elif button_id == "btn_agendar":
            await self._update_session(session, "AGENDAR_RUC")
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "¡Perfecto! Para agendar una visita necesito algunos datos.\n\n"
                    "📋 Por favor, ingresa tu *RUC* (11 dígitos):\n\n"
                    "_Escribe *volver* para regresar al menú._"
                ))]
            )
        else:
            # Si no presionó un botón válido, reenviar el menú
            return self._send_menu()

    # ===================== ASESOR HANDLER =====================

    async def _handle_asesor(self, session, data, phone, tipo_interes="ASESORIA", mensaje_contexto=None):
        """Verifica si el cliente ya tiene un lead/comercial asignado, si no, asigna uno por Round Robin."""
        query_inbox = select(Inbox).where(
            and_(Inbox.telefono.like(f"%{phone}%"), Inbox.estado == 'PENDIENTE')
        )
        result = await self.db.execute(query_inbox)
        existing_lead = result.scalars().first()

        if existing_lead and existing_lead.asignado_a:
            query_user = select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == existing_lead.asignado_a)
            result_user = await self.db.execute(query_user)
            user = result_user.scalar_one_or_none()
            nombre_comercial = self._get_user_name(user)

            # Mantener sesión en ATENDIDO con cooldown corto
            datos_atendido = {"asesor_nombre": nombre_comercial, "inbox_id": existing_lead.id}
            await self._update_session_corta(session, "ATENDIDO", datos_atendido)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=f"Su asesor *{nombre_comercial}* le atenderá en unos minutos. 👋")]
            )
        else:
            inbox_service = InboxService(self.db)
            distribute_data = InboxDistribute(
                telefono=data.from_number,
                mensaje=mensaje_contexto or "Solicita hablar con un asesor",
                nombre_display=data.contact_name,
                tipo_interes=tipo_interes
            )
            result = await inbox_service.distribute_lead(distribute_data)
            nombre_comercial = result["assigned_to"]["nombre"]
            inbox_id = result.get("inbox_id")

            # Mantener sesión en ATENDIDO con cooldown corto
            datos_atendido = {"asesor_nombre": nombre_comercial, "inbox_id": inbox_id}
            await self._update_session_corta(session, "ATENDIDO", datos_atendido)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=f"¡Perfecto! El asesor *{nombre_comercial}* se pondrá en contacto contigo en breve. 🚀")]
            )

    # ===================== ATENDIDO HANDLER =====================

    async def _handle_atendido(self, session, data, phone):
        """Mensajes post-asignación. Reenviar al chat del inbox y responder contextualmente."""
        datos = self._get_session_data(session)
        asesor = datos.get("asesor_nombre", "su asesor")
        inbox_id = datos.get("inbox_id")
        texto = data.message_text.strip()

        # Si el cliente quiere volver al menú, eliminar sesión
        text_lower = texto.lower()
        if text_lower in ("menu", "menú", "inicio"):
            await self._delete_session(session)
            return self._send_menu()

        # Guardar mensaje en el chat del inbox para que el asesor lo vea
        if inbox_id and texto:
            try:
                chat_svc = ChatService(self.db)
                await chat_svc.save_message(ChatMessageCreate(
                    inbox_id=inbox_id,
                    telefono=data.from_number,
                    direccion='ENTRANTE',
                    remitente_tipo='CLIENTE',
                    contenido=texto,
                    estado_envio='RECIBIDO'
                ))
            except Exception as e:
                logger.warning(f"No se pudo guardar mensaje post-asignación: {e}")

        return WhatsAppResponse(
            action="send_text",
            messages=[BotMessage(
                type="text",
                content=f"✅ Mensaje recibido. *{asesor}* podrá ver tu mensaje. Si necesitas algo más, escribe *menu*. 😊"
            )]
        )

    # ===================== COTIZAR HANDLER =====================

    async def _handle_cotizar_requerimientos(self, session, data, phone):
        """Primer mensaje de requerimientos recibido. Pasar a COTIZAR_PROCESANDO y guardar timestamp."""
        text_lower = data.message_text.strip().lower()
        if text_lower == "volver" or data.button_id == "btn_volver":
            await self._delete_session(session)
            return self._send_menu()

        # Guardar timestamp del último mensaje recibido y pasar a PROCESANDO
        datos = {"ultimo_mensaje_at": datetime.now().isoformat()}
        await self._update_session(session, "COTIZAR_PROCESANDO", datos)

        # No respondemos nada aún. La tarea en segundo plano se encargará.
        return WhatsAppResponse(action="no_action", messages=[])

    async def _handle_cotizar_procesando(self, session, data, phone):
        """Cliente sigue enviando mensajes durante la ventana de gracia. Reiniciar el temporizador."""
        # Solo actualizar el timestamp del último mensaje (reinicia el temporizador)
        datos = self._get_session_data(session)
        datos["ultimo_mensaje_at"] = datetime.now().isoformat()
        await self._update_session(session, "COTIZAR_PROCESANDO", datos)

        # No respondemos nada, silencio total.
        return WhatsAppResponse(action="no_action", messages=[])

    # ===================== AGENDAR: RUC =====================

    async def _handle_agendar_ruc(self, session, data):
        text_lower = data.message_text.strip().lower()

        # Volver al menú
        if text_lower == "volver" or data.button_id == "btn_volver":
            await self._delete_session(session)
            return self._send_menu()

        ruc = _sanitizar_ruc(data.message_text)

        if not ruc.isdigit() or len(ruc) != 11:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "❌ El RUC debe tener exactamente *11 dígitos numéricos*.\n\n"
                    "Por favor, ingrésalo de nuevo:\n\n"
                    "_Escribe *volver* para regresar al menú._"
                ))]
            )

        if not (ruc.startswith("10") or ruc.startswith("20")):
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "❌ El RUC debe empezar con *10* (persona natural) o *20* (empresa).\n\n"
                    "Ingrésalo de nuevo:\n\n"
                    "_Escribe *volver* para regresar al menú._"
                ))]
            )

        # RUC válido → pasar directamente a tipo de visita (sin pedir razón social)
        datos = {"ruc": ruc}
        await self._update_session(session, "AGENDAR_TIPO", datos)

        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=f"✅ RUC registrado: *{ruc}*\n\n¿Cómo prefieren la visita?",
                buttons=VISIT_TYPE_BUTTONS
            )]
        )

    # ===================== AGENDAR: TIPO VISITA =====================

    async def _handle_agendar_tipo(self, session, data):
        button_id = data.button_id
        datos = self._get_session_data(session)

        if button_id == "btn_volver":
            # Volver a pedir el RUC
            await self._update_session(session, "AGENDAR_RUC", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "📋 Por favor, ingresa tu *RUC* (11 dígitos):\n\n"
                    "_Escribe *volver* para regresar al menú._"
                ))]
            )

        if button_id == "btn_nos_visita":
            datos["tipo_visita"] = "VISITA_OFICINA"
            await self._update_session(session, "AGENDAR_FECHA", datos)
            return await self._show_date_list(session, datos,
                prefix="📍 Nuestra dirección:\n*Centro Aéreo Comercial, módulo E, oficina 507*\n\n")
        elif button_id == "btn_los_visitamos":
            datos["tipo_visita"] = "VISITA_CLIENTE"
            await self._update_session(session, "AGENDAR_UBICACION", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "📍 Por favor, ingresa la *dirección* donde debemos visitarlos.\n\n"
                    "También puedes *enviar tu ubicación* desde WhatsApp (📎 > Ubicación).\n\n"
                    "_Escribe *volver* para regresar._"
                ))]
            )
        else:
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(type="buttons", body="Por favor, selecciona una opción:", buttons=VISIT_TYPE_BUTTONS)]
            )

    # ===================== AGENDAR: UBICACION =====================

    async def _handle_agendar_ubicacion(self, session, data):
        text_lower = data.message_text.strip().lower()
        
        if text_lower == "volver" or data.button_id == "btn_volver":
            datos = self._get_session_data(session)
            await self._update_session(session, "AGENDAR_TIPO", datos)
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(
                    type="buttons",
                    body=f"RUC: *{datos.get('ruc', 'N/A')}*\n\n¿Cómo prefieren la visita?",
                    buttons=VISIT_TYPE_BUTTONS
                )]
            )

        # Handle GPS location
        if data.message_type == "location" and data.latitude and data.longitude:
            direccion = await self._reverse_geocode(data.latitude, data.longitude)
            datos = self._get_session_data(session)
            datos["direccion"] = direccion
            datos["lat"] = data.latitude
            datos["lng"] = data.longitude
            await self._update_session(session, "AGENDAR_FECHA", datos)
            return await self._show_date_list(session, datos,
                prefix=f"✅ Ubicación registrada:\n📍 *{direccion}*\n\n")

        # Handle text address
        direccion = data.message_text.strip()
        if len(direccion) < 5:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "❌ La dirección es muy corta. Ingresa más detalle (calle, distrito, referencia).\n\n"
                    "También puedes *enviar tu ubicación* desde WhatsApp (📎 > Ubicación).\n\n"
                    "_Escribe *volver* para regresar._"
                ))]
            )

        if len(direccion) > 200:
            direccion = direccion[:200]

        datos = self._get_session_data(session)
        datos["direccion"] = direccion
        await self._update_session(session, "AGENDAR_FECHA", datos)
        return await self._show_date_list(session, datos,
            prefix="✅ Dirección registrada.\n\n")

    # ===================== AGENDAR: FECHA (Lista Interactiva) =====================

    async def _show_date_list(self, session, datos, prefix="", pagina=0):
        """Generate interactive list with available business days."""
        hoy = date.today()
        all_dias = _proximos_dias_habiles(hoy, cantidad=14)
        
        # Paginate: 5 days per page
        start = pagina * 5
        end = start + 5
        dias_pagina = all_dias[start:end]
        has_more = end < len(all_dias)

        rows = []
        for d in dias_pagina:
            dia_nombre = DIAS_SEMANA.get(d.weekday(), "")
            rows.append({
                "id": f"fecha_{d.strftime('%d/%m/%Y')}",
                "title": f"{dia_nombre} {d.strftime('%d/%m')}",
                "description": d.strftime('%d/%m/%Y')
            })

        if has_more:
            rows.append({
                "id": "fecha_mas",
                "title": "Más fechas →",
                "description": "Ver más opciones de fecha"
            })

        rows.append({
            "id": "fecha_volver",
            "title": "⬅️ Volver",
            "description": "Regresar al paso anterior"
        })

        datos["fecha_pagina"] = pagina
        await self._update_session(session, "AGENDAR_FECHA", datos)

        body_text = f"{prefix}📅 Selecciona una fecha para la visita:"

        return WhatsAppResponse(
            action="send_list",
            messages=[BotMessage(
                type="list",
                body=body_text,
                header="Fechas Disponibles",
                button_text="Ver fechas",
                sections=[{
                    "title": "Próximos días hábiles",
                    "rows": rows
                }]
            )]
        )

    async def _handle_agendar_fecha(self, session, data):
        button_id = data.button_id
        text_lower = data.message_text.strip().lower()
        datos = self._get_session_data(session)

        # Volver al paso anterior (texto o botón)
        if text_lower == "volver" or button_id == "fecha_volver":
            tipo = datos.get("tipo_visita")
            if tipo == "VISITA_CLIENTE":
                await self._update_session(session, "AGENDAR_UBICACION", datos)
                return WhatsAppResponse(
                    action="send_text",
                    messages=[BotMessage(type="text", content=(
                        "📍 Ingresa la *dirección* donde debemos visitarlos.\n\n"
                        "También puedes *enviar tu ubicación* desde WhatsApp.\n\n"
                        "_Escribe *volver* para regresar._"
                    ))]
                )
            else:
                await self._update_session(session, "AGENDAR_TIPO", datos)
                return WhatsAppResponse(
                    action="send_buttons",
                    messages=[BotMessage(
                        type="buttons",
                        body=f"RUC: *{datos.get('ruc', 'N/A')}*\n\n¿Cómo prefieren la visita?",
                        buttons=VISIT_TYPE_BUTTONS
                    )]
                )

        # Detectar cambio de intención: cliente cambia tipo de visita mid-flow
        tipo_detectado = self._detectar_tipo_visita_texto(data.message_text)
        if tipo_detectado:
            datos["tipo_visita"] = tipo_detectado
            if tipo_detectado == "VISITA_CLIENTE":
                await self._update_session(session, "AGENDAR_UBICACION", datos)
                return WhatsAppResponse(
                    action="send_text",
                    messages=[BotMessage(type="text", content=(
                        "👍 Entendido, cambiaremos a visita a tu ubicación.\n\n"
                        "📍 Por favor, ingresa la *dirección* donde debemos visitarlos.\n\n"
                        "También puedes *enviar tu ubicación* desde WhatsApp (📎 > Ubicación).\n\n"
                        "_Escribe *volver* para regresar._"
                    ))]
                )
            else:
                await self._update_session(session, "AGENDAR_FECHA", datos)
                return await self._show_date_list(session, datos,
                    prefix="👍 Entendido, te esperamos en nuestras oficinas.\n\n📍 Nuestra dirección:\n*Centro Aéreo Comercial, módulo E, oficina 507*\n\n")

        if button_id == "fecha_mas":
            pagina_actual = datos.get("fecha_pagina", 0)
            return await self._show_date_list(session, datos, pagina=pagina_actual + 1)

        # Extract date from button_id like "fecha_20/03/2026"
        if button_id and button_id.startswith("fecha_"):
            fecha_str = button_id.replace("fecha_", "")
            try:
                fecha = datetime.strptime(fecha_str, "%d/%m/%Y")
                datos["fecha"] = fecha_str
                await self._update_session(session, "AGENDAR_HORA", datos)
                return await self._show_hour_list(session, datos, fecha)
            except ValueError:
                pass

        # Unexpected input → show list again
        return await self._show_date_list(session, datos)

    # ===================== AGENDAR: HORA (Lista Interactiva) =====================

    async def _show_hour_list(self, session, datos, fecha: datetime):
        """Generate interactive list with available hours for the selected date."""
        available = await self._get_available_hours(fecha)

        rows = []
        for h in available:
            rows.append({
                "id": f"hora_{h}",
                "title": h,
                "description": f"Agendar a las {h}"
            })

        rows.append({
            "id": "hora_volver",
            "title": "⬅️ Volver",
            "description": "Cambiar la fecha"
        })

        fecha_str = datos.get("fecha", "")

        return WhatsAppResponse(
            action="send_list",
            messages=[BotMessage(
                type="list",
                body=f"📅 Fecha: *{fecha_str}*\n\n⏰ Selecciona un horario:",
                header="Horarios Disponibles",
                button_text="Ver horarios",
                sections=[{
                    "title": "Horarios del día",
                    "rows": rows
                }]
            )]
        )

    async def _handle_agendar_hora(self, session, data):
        button_id = data.button_id
        text_lower = data.message_text.strip().lower()
        datos = self._get_session_data(session)

        # Volver al paso anterior (texto o botón)
        if text_lower == "volver" or button_id == "hora_volver":
            await self._update_session(session, "AGENDAR_FECHA", datos)
            return await self._show_date_list(session, datos)

        if button_id and button_id.startswith("hora_"):
            hora = button_id.replace("hora_", "")
            datos["hora"] = hora
            await self._update_session(session, "AGENDAR_CONFIRMAR", datos)

            tipo = "Nos visitará en nuestras oficinas" if datos["tipo_visita"] == "VISITA_OFICINA" else f"Los visitaremos en: {datos.get('direccion', 'N/A')}"
            summary = (
                f"📋 *Resumen de la cita:*\n\n"
                f"🏢 RUC: {datos['ruc']}\n"
                f"📍 Modalidad: {tipo}\n"
                f"📅 Fecha: {datos['fecha']}\n"
                f"⏰ Hora: {hora}\n\n"
                f"¿Desea confirmar la cita?"
            )

            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(type="buttons", body=summary, buttons=CONFIRM_BUTTONS)]
            )

        # Unexpected input
        fecha = datetime.strptime(datos.get("fecha", "01/01/2026"), "%d/%m/%Y")
        return await self._show_hour_list(session, datos, fecha)

    # ===================== AGENDAR: CONFIRMAR =====================

    async def _handle_agendar_confirmar(self, session, data, phone):
        if data.button_id == "btn_volver":
            datos = self._get_session_data(session)
            fecha = datetime.strptime(datos.get("fecha", "01/01/2026"), "%d/%m/%Y")
            await self._update_session(session, "AGENDAR_HORA", datos)
            return await self._show_hour_list(session, datos, fecha)

        if data.button_id == "btn_confirmar":
            datos = self._get_session_data(session)

            # Distribute lead (assigns commercial via round-robin)
            inbox_service = InboxService(self.db)
            distribute_data = InboxDistribute(
                telefono=phone,
                mensaje=f"Agendar visita - RUC: {datos['ruc']}",
                nombre_display=data.contact_name,
                tipo_interes="VISITA"
            )
            result = await inbox_service.distribute_lead(distribute_data)
            comercial_nombre = result["assigned_to"]["nombre"]
            comercial_id = result["assigned_to"]["id"]

            # Crear cita
            try:
                fecha = datetime.strptime(datos["fecha"], "%d/%m/%Y")
                nueva_cita = Cita(
                    tipo_agenda="INDIVIDUAL",
                    comercial_id=comercial_id,
                    fecha=fecha,
                    hora=datos["hora"],
                    tipo_cita=datos["tipo_visita"],
                    direccion=datos.get("direccion", "Centro Aéreo Comercial, módulo E, oficina 507"),
                    motivo=f"Cita agendada via WhatsApp - RUC: {datos['ruc']}",
                    estado="PENDIENTE_APROBACION",
                    created_by=comercial_id,
                )
                self.db.add(nueva_cita)
                await self.db.commit()
            except Exception as e:
                logger.error(f"Error creando cita vía WhatsApp: {e}", exc_info=True)
                await self._delete_session(session)
                return WhatsAppResponse(
                    action="send_text",
                    messages=[BotMessage(type="text", content=(
                        f"⚠️ Tu solicitud fue registrada pero la cita no pudo ser creada automáticamente.\n\n"
                        f"El asesor *{comercial_nombre}* te contactará para confirmar los detalles.\n\n"
                        f"¡Gracias por elegir Grupo Corban! 🚀"
                    ))]
                )

            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    f"✅ ¡Cita agendada exitosamente!\n\n"
                    f"El asesor *{comercial_nombre}* confirmará la cita y se pondrá en contacto contigo.\n\n"
                    f"¡Gracias por elegir Grupo Corban! 🚀"
                ))]
            )
        elif data.button_id == "btn_cancelar":
            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Cita cancelada. Escribe *menu* cuando quieras volver a empezar. 👋")]
            )
        else:
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(type="buttons", body="Por favor, confirma o cancela:", buttons=CONFIRM_BUTTONS)]
            )

    # ===================== HELPERS =====================

    def _send_menu(self, es_regreso=False) -> WhatsAppResponse:
        """Envía el menú principal. Si es_regreso=True, usa mensaje corto en vez de bienvenida completa."""
        mensaje = MENSAJE_MENU_REGRESO if es_regreso else MENSAJE_BIENVENIDA
        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=mensaje,
                buttons=MENU_BUTTONS
            )]
        )

    def _get_user_name(self, user) -> str:
        if user and user.empleado:
            return f"{user.empleado.nombres} {user.empleado.apellido_paterno}"
        elif user:
            return user.correo_corp
        return "Un asesor"

    def _detectar_tipo_visita_texto(self, texto: str):
        """Detecta intención de tipo de visita desde texto libre del cliente."""
        texto_lower = texto.strip().lower()
        patrones_nos_visita = ["los visito", "los visitaré", "los visitare", "iré a", "ire a", "voy a ir", "yo voy"]
        patrones_visitenme = ["visítenme", "visitenme", "que me visiten", "vengan", "nos visiten", "visitenos", "visítenos"]

        for patron in patrones_visitenme:
            if patron in texto_lower:
                return "VISITA_CLIENTE"
        for patron in patrones_nos_visita:
            if patron in texto_lower:
                return "VISITA_OFICINA"
        return None

    def _get_session_data(self, session) -> dict:
        if session.datos:
            try:
                return json.loads(session.datos)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    async def _reverse_geocode(self, lat: float, lon: float) -> str:
        """Convert lat/lng to a human-readable address using Nominatim (OpenStreetMap)."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": lat, "lon": lon, "format": "json", "addressdetails": 1},
                    headers={"User-Agent": "SGI-Corban/1.0"},
                    timeout=5.0
                )
                data = response.json()
                return data.get("display_name", f"Lat: {lat}, Lon: {lon}")
        except Exception as e:
            logger.error(f"Error en geocodificación inversa: {e}")
            return f"Lat: {lat}, Lon: {lon}"

    async def _get_active_session(self, phone: str):
        query = select(ConversationSession).where(
            and_(
                ConversationSession.telefono.like(f"%{phone}%"),
                or_(
                    ConversationSession.expires_at.is_(None),
                    ConversationSession.expires_at > datetime.now()
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _get_expired_session(self, phone: str):
        """Find an expired session for this phone (for timeout notification)."""
        query = select(ConversationSession).where(
            and_(
                ConversationSession.telefono.like(f"%{phone}%"),
                ConversationSession.expires_at <= datetime.now()
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def _cleanup_expired_sessions(self):
        """Delete all sessions expired more than 1 hour ago (opportunistic cleanup)."""
        try:
            stmt = delete(ConversationSession).where(
                ConversationSession.expires_at < datetime.now() - timedelta(hours=1)
            )
            await self.db.execute(stmt)
            await self.db.commit()
        except Exception as e:
            logger.warning(f"Error limpiando sesiones expiradas: {e}")

    async def _create_session(self, phone: str, estado: str, datos: dict = None):
        session = ConversationSession(
            telefono=phone,
            estado=estado,
            datos=json.dumps(datos) if datos else None,
            expires_at=datetime.now() + timedelta(minutes=SESSION_TIMEOUT_MINUTES),
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def _update_session(self, session, estado: str, datos: dict = None):
        session.estado = estado
        if datos is not None:
            session.datos = json.dumps(datos)
        session.updated_at = datetime.now()
        session.expires_at = datetime.now() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)
        await self.db.commit()

    async def _update_session_corta(self, session, estado: str, datos: dict = None):
        """Actualiza sesión con timeout corto (para estado ATENDIDO)."""
        session.estado = estado
        if datos is not None:
            session.datos = json.dumps(datos)
        session.updated_at = datetime.now()
        session.expires_at = datetime.now() + timedelta(minutes=ATENDIDO_TIMEOUT_MINUTES)
        await self.db.commit()

    async def _delete_session(self, session):
        await self.db.delete(session)
        await self.db.commit()

    async def _get_available_hours(self, fecha: datetime) -> list:
        """Get available hours for a given date checking against existing appointments."""
        all_hours = ["9:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        try:
            query = select(Cita.hora).where(
                and_(
                    Cita.fecha == fecha,
                    Cita.estado.in_(["PENDIENTE_APROBACION", "APROBADA"])
                )
            )
            result = await self.db.execute(query)
            taken = [r[0] for r in result.all()]
            available = [h for h in all_hours if h not in taken]
            return available if available else all_hours
        except Exception:
            return all_hours
