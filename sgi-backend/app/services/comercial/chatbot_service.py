import json
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from sqlalchemy.orm import selectinload

from app.models.comercial_session import ConversationSession
from app.models.comercial_inbox import Inbox
from app.models.comercial import Cliente, ClienteContacto, Cita
from app.models.seguridad import Usuario, Rol
from app.schemas.comercial.whatsapp import WhatsAppIncoming, WhatsAppResponse, BotMessage
from app.schemas.comercial.inbox import InboxDistribute
from app.services.comercial.inbox_service import InboxService


# --- Constants ---
MENU_BUTTONS = [
    {"id": "btn_asesor", "title": "Hablar con asesor"},
    {"id": "btn_info", "title": "Conocer Corban"},
    {"id": "btn_agendar", "title": "Agendar visita"},
]

VISIT_TYPE_BUTTONS = [
    {"id": "btn_nos_visita", "title": "Los visitaré"},
    {"id": "btn_los_visitamos", "title": "Visítenme"},
]

CONFIRM_BUTTONS = [
    {"id": "btn_confirmar", "title": "✅ Confirmar"},
    {"id": "btn_cancelar", "title": "❌ Cancelar"},
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


class ChatbotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_message(self, data: WhatsAppIncoming) -> WhatsAppResponse:
        """Main entry point: process an incoming message and return bot response."""
        
        # 0. Ignore non-processable messages
        if data.message_type not in ("text", "interactive"):
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="Solo puedo recibir mensajes de texto 😊. Escribe *menu* para ver las opciones.")]
            )

        # 1. Normalize phone
        phone = data.from_number.replace(" ", "").replace("+", "")
        if phone.startswith("51"):
            phone = phone[2:]

        # 2. Get or create session
        session = await self._get_active_session(phone)

        # 3. Check for global commands (menu, cancelar)
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

        # 4. If no session, show menu (first message or after expiry)
        if not session:
            # Check if it's a button press from the menu
            if button_id in ("btn_asesor", "btn_info", "btn_agendar"):
                session = await self._create_session(phone, "MENU")
            else:
                return self._send_menu(data.contact_name)

        # 5. Route based on current state
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
                # Unknown state, reset
                await self._delete_session(session)
                return self._send_menu(data.contact_name)
        except Exception as e:
            # On any error, send friendly message
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=f"Ocurrió un error. Escribe *menu* para volver a empezar. 🔄")]
            )

    # ===================== MENU HANDLER =====================

    async def _handle_menu(self, session, data, phone):
        button_id = data.button_id

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
                messages=[BotMessage(type="text", content="¡Perfecto! Para agendar una visita necesito algunos datos.\n\n📋 Por favor, ingresa tu *RUC* (11 dígitos):")]
            )
        else:
            # Text without button in MENU state → show menu again
            return self._send_menu(data.contact_name)

    # ===================== ASESOR HANDLER =====================

    async def _handle_asesor(self, session, data, phone):
        """Check if client has existing lead/commercial, then assign."""
        # Check existing PENDIENTE lead
        query_inbox = select(Inbox).where(
            and_(Inbox.telefono.like(f"%{phone}%"), Inbox.estado == 'PENDIENTE')
        )
        result = await self.db.execute(query_inbox)
        existing_lead = result.scalars().first()

        if existing_lead and existing_lead.asignado_a:
            # Existing lead - return assigned commercial name
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
            # New lead - distribute via round-robin
            inbox_service = InboxService(self.db)
            distribute_data = InboxDistribute(
                telefono=data.from_number,
                mensaje=data.message_text or "Solicita hablar con un asesor",
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
        """Handle post-info responses."""
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

    # ===================== AGENDAR FLOW =====================

    async def _handle_agendar_ruc(self, session, data):
        """Validate and store RUC."""
        ruc = data.message_text.strip()

        # Validation
        if not ruc.isdigit() or len(ruc) != 11:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ El RUC debe tener exactamente *11 dígitos numéricos*.\n\nPor favor, ingrésalo de nuevo:")]
            )

        if not (ruc.startswith("10") or ruc.startswith("20")):
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ El RUC debe empezar con *10* (persona natural) o *20* (empresa).\n\nIngrésalo de nuevo:")]
            )

        # Save and move to next step
        datos = {"ruc": ruc}
        await self._update_session(session, "AGENDAR_RAZON", datos)
        return WhatsAppResponse(
            action="send_text",
            messages=[BotMessage(type="text", content="✅ RUC registrado.\n\nAhora ingresa tu *razón social*:")]
        )

    async def _handle_agendar_razon(self, session, data):
        """Store razón social."""
        razon = data.message_text.strip()

        if len(razon) < 3:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ La razón social es muy corta. Ingrésala de nuevo:")]
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

    async def _handle_agendar_tipo(self, session, data):
        """Handle visit type selection."""
        button_id = data.button_id
        datos = self._get_session_data(session)

        if button_id == "btn_nos_visita":
            datos["tipo_visita"] = "VISITA_OFICINA"
            await self._update_session(session, "AGENDAR_FECHA", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content=(
                    "📍 Nuestra dirección:\n"
                    "*Centro Aéreo Comercial, módulo E, oficina 507*\n\n"
                    "📅 ¿Qué día le gustaría visitarnos?\n"
                    "Formato: *DD/MM/AAAA* (ejemplo: 20/03/2026)"
                ))]
            )
        elif button_id == "btn_los_visitamos":
            datos["tipo_visita"] = "VISITA_CLIENTE"
            await self._update_session(session, "AGENDAR_UBICACION", datos)
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="📍 Por favor, ingresa la *dirección* donde debemos visitarlos:")]
            )
        else:
            return WhatsAppResponse(
                action="send_buttons",
                messages=[BotMessage(type="buttons", body="Por favor, selecciona una opción:", buttons=VISIT_TYPE_BUTTONS)]
            )

    async def _handle_agendar_ubicacion(self, session, data):
        """Store client address."""
        direccion = data.message_text.strip()

        if len(direccion) < 5:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ La dirección es muy corta. Ingrésala de nuevo con más detalle:")]
            )

        datos = self._get_session_data(session)
        datos["direccion"] = direccion
        await self._update_session(session, "AGENDAR_FECHA", datos)

        return WhatsAppResponse(
            action="send_text",
            messages=[BotMessage(type="text", content="✅ Dirección registrada.\n\n📅 ¿Qué día prefiere?\nFormato: *DD/MM/AAAA* (ejemplo: 20/03/2026)")]
        )

    async def _handle_agendar_fecha(self, session, data):
        """Validate and store date."""
        fecha_text = data.message_text.strip()

        # Try parsing date
        try:
            fecha = datetime.strptime(fecha_text, "%d/%m/%Y")
        except ValueError:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ Formato incorrecto. Usa *DD/MM/AAAA*\nEjemplo: 20/03/2026")]
            )

        # Validate not in past
        if fecha.date() < datetime.now().date():
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ Esa fecha ya pasó. Ingresa una *fecha futura*:")]
            )

        # Validate not weekend
        if fecha.weekday() >= 5:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ Solo agendamos de *lunes a viernes*. Ingresa otra fecha:")]
            )

        datos = self._get_session_data(session)
        datos["fecha"] = fecha_text
        await self._update_session(session, "AGENDAR_HORA", datos)

        # Get available hours
        available = await self._get_available_hours(fecha)
        hours_text = ", ".join(available) if available else "9:00, 10:00, 11:00, 14:00, 15:00, 16:00"

        return WhatsAppResponse(
            action="send_text",
            messages=[BotMessage(type="text", content=f"✅ Fecha: *{fecha_text}*\n\n⏰ ¿A qué hora?\nHorarios disponibles: *{hours_text}*\n\nEscribe la hora (ejemplo: 10:00):")]
        )

    async def _handle_agendar_hora(self, session, data):
        """Validate and store time."""
        hora_text = data.message_text.strip()

        # Basic validation
        valid_hours = ["8:00", "9:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00",
                       "08:00", "09:00"]
        
        if hora_text not in valid_hours:
            return WhatsAppResponse(
                action="send_text",
                messages=[BotMessage(type="text", content="❌ Hora no válida. Horarios disponibles: *9:00, 10:00, 11:00, 14:00, 15:00, 16:00*\n\nEscribe la hora:")]
            )

        datos = self._get_session_data(session)
        datos["hora"] = hora_text
        await self._update_session(session, "AGENDAR_CONFIRMAR", datos)

        # Build summary
        tipo = "Nos visitará en nuestras oficinas" if datos["tipo_visita"] == "VISITA_OFICINA" else f"Los visitaremos en: {datos.get('direccion', 'N/A')}"
        summary = (
            f"📋 *Resumen de la cita:*\n\n"
            f"🏢 RUC: {datos['ruc']}\n"
            f"📛 Razón Social: {datos['razon_social']}\n"
            f"📍 Modalidad: {tipo}\n"
            f"📅 Fecha: {datos['fecha']}\n"
            f"⏰ Hora: {hora_text}\n\n"
            f"¿Desea confirmar la cita?"
        )

        return WhatsAppResponse(
            action="send_buttons",
            messages=[BotMessage(type="buttons", body=summary, buttons=CONFIRM_BUTTONS)]
        )

    async def _handle_agendar_confirmar(self, session, data, phone):
        """Create the appointment or cancel."""
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
            except Exception:
                pass  # Cita creation is best-effort, lead is already saved

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
