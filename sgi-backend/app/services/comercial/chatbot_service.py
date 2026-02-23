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

logger = logging.getLogger(__name__)


# ==========================================
# CONSTANTS
# ==========================================

MENU_BUTTONS = [
    {"id": "btn_asesor", "title": "Hablar con asesor"},
    {"id": "btn_info", "title": "Conocer Corban"},
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

BACK_BUTTONS = [
    {"id": "btn_menu", "title": "Volver al menú"},
    {"id": "btn_fin", "title": "Gracias, eso es todo"},
]

INFO_MESSAGE = (
    "Somos *Grupo Corban*, una agencia de Cargas y Aduanas con más de "
    "15 años de experiencia manejando todo tipo de cargas.\n\n"
    "📍 Estamos ubicados en el *Centro Aéreo Comercial, módulo E, oficina 507*."
)

SESSION_TIMEOUT_MINUTES = 30

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
        """Main entry point: process an incoming message and return bot response."""
        
        # 0. Ignore non-processable messages (except location)
        if data.message_type not in ("text", "interactive", "location"):
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Solo puedo recibir mensajes de texto o ubicación 😊. Escribe *menu* para ver las opciones.")]
            )

        # 1. Normalize phone
        phone = data.from_number.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]

        # 2. Cleanup expired sessions (opportunistic)
        await self._cleanup_expired_sessions()

        # 3. Get active session
        session = await self._get_active_session(phone)

        # 4. Check for global commands
        text_lower = data.message_text.strip().lower()
        button_id = data.button_id

        if text_lower in ("menu", "menú", "inicio", "hola") or button_id == "btn_menu":
            if session:
                await self._delete_session(session)
            return self._send_menu(data.contact_name)

        if text_lower in ("cancelar", "salir") or button_id == "btn_cancelar":
            if session:
                await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Operación cancelada. Escribe *menu* cuando quieras volver a empezar. 👋")]
            )

        if button_id == "btn_fin":
            if session:
                await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="¡Gracias por comunicarte con Grupo Corban! Estamos para ayudarte. 😊")]
            )

        # 5. If no session
        if not session:
            if button_id in ("btn_asesor", "btn_info", "btn_agendar"):
                session = await self._create_session(phone, "MENU")
            else:
                # Check if there's an expired session (timeout message)
                expired = await self._get_expired_session(phone)
                if expired:
                    await self._delete_session(expired)
                    return WhatsAppResponse(
                        action="send_multiple",
                        messages=[
                            BotMessage(type="text", content="Tu sesión anterior expiró por inactividad. ¡Empecemos de nuevo! 👋"),
                            BotMessage(
                                type="buttons",
                                body=f"¡Hola {data.contact_name}! 👋 Bienvenido a *Grupo Corban*.\n\n¿En qué podemos ayudarte?",
                                buttons=MENU_BUTTONS
                            ),
                        ]
                    )
                return self._send_menu(data.contact_name)

        # 6. Route based on current state
        state = session.estado if session else "MENU"
        
        try:
            if state == "MENU":
                return await self._handle_menu(session, data, phone)
            elif state == "INFO":
                return await self._handle_info(session, data)
            elif state == "AGENDAR_RUC":
                return await self._handle_agendar_ruc(session, data)
            elif state == "AGENDAR_RAZON":
                return await self._handle_agendar_razon(session, data)
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
                return self._send_menu(data.contact_name)
        except Exception as e:
            logger.error(f"Error en chatbot (state={state}, phone={phone}): {e}", exc_info=True)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Ocurrió un error inesperado. Escribe *menu* para volver a empezar. 🔄")]
            )

    # ===================== MENU HANDLER =====================

    async def _handle_menu(self, session, data, phone):
        button_id = data.button_id
        text_lower = data.message_text.strip().lower()

        if button_id == "btn_asesor":
            return await self._handle_asesor(session, data, phone)
        elif button_id == "btn_info":
            await self._update_session(session, "INFO")
            return WhatsAppResponse(
                action="send_multiple",
                messages=[
                    BotMessage(type="text", content=INFO_MESSAGE),
                    BotMessage(type="buttons", body="¿Deseas algo más?", buttons=BACK_BUTTONS),
                ]
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
            # Fallback para texto libre
            if text_lower in ("menu", "menú", "inicio", "hola"):
                 return self._send_menu(data.contact_name)
                 
            # Si escribio algo que no es boton pero parece una oracion o pregunta (> 5 chars)
            if len(text_lower) > 5:
                # Si en el texto dice explicitly "agendar" o "cita"
                if any(word in text_lower for word in ["agendar", "cita", "visita"]):
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
                    # Enviar con asesor usando su mensaje original de contexto
                    return await self._handle_asesor(session, data, phone)
            
            # Si solo puso "ok", "si", etc. repetimos menu
            return self._send_menu(data.contact_name)

    # ===================== ASESOR HANDLER =====================

    async def _handle_asesor(self, session, data, phone):
        """Check if client has existing lead/commercial, then assign."""
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

            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=f"¡Hola de nuevo, {data.contact_name}! Su comercial *{nombre_comercial}* le atenderá en unos minutos. 👋")]
            )
        else:
            inbox_service = InboxService(self.db)
            mensaje_contexto = data.message_text if data.message_text and data.button_id != "btn_asesor" else "Solicita hablar con un asesor"
            distribute_data = InboxDistribute(
                telefono=data.from_number,
                mensaje=mensaje_contexto,
                nombre_display=data.contact_name,
                tipo_interes="ASESORIA"
            )
            result = await inbox_service.distribute_lead(distribute_data)
            nombre_comercial = result["assigned_to"]["nombre"]

            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=f"¡Perfecto! El asesor *{nombre_comercial}* se pondrá en contacto contigo en breve. 🚀")]
            )

    # ===================== INFO HANDLER =====================

    async def _handle_info(self, session, data):
        if data.button_id == "btn_menu":
            await self._update_session(session, "MENU")
            return self._send_menu(data.contact_name)
        elif data.button_id == "btn_fin":
            await self._delete_session(session)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="¡Gracias por comunicarte con Grupo Corban! 😊")]
            )
        else:
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(type="buttons", body="¿Deseas algo más?", buttons=BACK_BUTTONS)]
            )

    # ===================== AGENDAR: RUC =====================

    async def _handle_agendar_ruc(self, session, data):
        text_lower = data.message_text.strip().lower()
        
        # Back
        if text_lower == "volver" or data.button_id == "btn_volver":
            await self._delete_session(session)
            return self._send_menu(data.contact_name)

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

        datos = {"ruc": ruc}
        await self._update_session(session, "AGENDAR_RAZON", datos)
        return WhatsAppResponse(
            action="send_text",
            messages=[BotMessage(type="text", content=(
                f"✅ RUC registrado: *{ruc}*\n\n"
                "Ahora ingresa tu *razón social*:\n\n"
                "_Escribe *volver* para corregir el RUC._"
            ))]
        )

    # ===================== AGENDAR: RAZON SOCIAL =====================

    async def _handle_agendar_razon(self, session, data):
        text_lower = data.message_text.strip().lower()
        
        if text_lower == "volver" or data.button_id == "btn_volver":
            datos = self._get_session_data(session)
            await self._update_session(session, "AGENDAR_RUC", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "📋 Por favor, ingresa tu *RUC* (11 dígitos):\n\n"
                    "_Escribe *volver* para regresar al menú._"
                ))]
            )

        razon = _sanitizar_razon_social(data.message_text)

        if len(razon) < 3:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "❌ La razón social es muy corta (mínimo 3 caracteres).\n\n"
                    "Ingrésala de nuevo:\n\n"
                    "_Escribe *volver* para corregir el RUC._"
                ))]
            )

        datos = self._get_session_data(session)
        datos["razon_social"] = razon
        await self._update_session(session, "AGENDAR_TIPO", datos)

        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=f"Perfecto, *{razon}*.\n\n¿Cómo prefieren la visita?",
                buttons=VISIT_TYPE_BUTTONS
            )]
        )

    # ===================== AGENDAR: TIPO VISITA =====================

    async def _handle_agendar_tipo(self, session, data):
        button_id = data.button_id
        datos = self._get_session_data(session)

        if button_id == "btn_volver":
            await self._update_session(session, "AGENDAR_RAZON", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    f"RUC actual: *{datos.get('ruc', 'N/A')}*\n\n"
                    "Ingresa tu *razón social*:\n\n"
                    "_Escribe *volver* para corregir el RUC._"
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
                    body=f"*{datos.get('razon_social', '')}*\n\n¿Cómo prefieren la visita?",
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
        datos = self._get_session_data(session)

        if button_id == "fecha_volver":
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
                        body=f"*{datos.get('razon_social', '')}*\n\n¿Cómo prefieren la visita?",
                        buttons=VISIT_TYPE_BUTTONS
                    )]
                )

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
        datos = self._get_session_data(session)

        if button_id == "hora_volver":
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
                f"📛 Razón Social: {datos['razon_social']}\n"
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
                mensaje=f"Agendar visita - {datos['razon_social']}",
                nombre_display=data.contact_name,
                tipo_interes="VISITA"
            )
            result = await inbox_service.distribute_lead(distribute_data)
            comercial_nombre = result["assigned_to"]["nombre"]
            comercial_id = result["assigned_to"]["id"]

            # Create appointment
            try:
                fecha = datetime.strptime(datos["fecha"], "%d/%m/%Y")
                nueva_cita = Cita(
                    tipo_agenda="INDIVIDUAL",
                    comercial_id=comercial_id,
                    fecha=fecha,
                    hora=datos["hora"],
                    tipo_cita=datos["tipo_visita"],
                    direccion=datos.get("direccion", "Centro Aéreo Comercial, módulo E, oficina 507"),
                    motivo=f"Cita agendada via WhatsApp - {datos['razon_social']} (RUC: {datos['ruc']})",
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

    def _send_menu(self, contact_name: str) -> WhatsAppResponse:
        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(
                type="buttons",
                body=f"¡Hola {contact_name}! 👋 Bienvenido a *Grupo Corban*.\n\n¿En qué podemos ayudarte?",
                buttons=MENU_BUTTONS
            )]
        )

    def _get_user_name(self, user) -> str:
        if user and user.empleado:
            return f"{user.empleado.nombres} {user.empleado.apellido_paterno}"
        elif user:
            return user.correo_corp
        return "Un asesor"

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
