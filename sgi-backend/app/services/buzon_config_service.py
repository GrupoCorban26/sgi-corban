"""
BuzonConfigService - Servicio de configuración del buzón de WhatsApp.
Gestiona: disponibilidad de comerciales, motivos de descarte, 
horarios/SLA, días no laborables y mensajes del bot.
"""
import json
import logging
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, delete
from sqlalchemy.orm import selectinload

from app.models.seguridad import Usuario, Rol
from app.models.comercial_catalogos import MotivoDescarteInbox
from app.models.comercial_inbox import Inbox
from app.models.core import Configuracion
from app.models.dia_no_laborable import DiaNoLaborable
from app.models.administrativo import Empleado

logger = logging.getLogger(__name__)

# Claves de configuración en core.configuraciones
CLAVE_HORARIO_LABORAL = "BUZON_HORARIO_LABORAL"
CLAVE_SLA_PRIMERA_RESPUESTA = "BUZON_SLA_PRIMERA_RESPUESTA_MIN"
CLAVE_SLA_RESOLUCION = "BUZON_SLA_RESOLUCION_HORAS"
CLAVE_BOT_MENSAJES = "BUZON_BOT_MENSAJES"
CLAVE_BOT_KEYWORDS = "BUZON_BOT_KEYWORDS"

# Defaults
DEFAULT_HORARIO = {
    "0": [{"inicio": "08:00", "fin": "13:00"}, {"inicio": "14:00", "fin": "18:00"}],
    "1": [{"inicio": "08:00", "fin": "13:00"}, {"inicio": "14:00", "fin": "18:00"}],
    "2": [{"inicio": "08:00", "fin": "13:00"}, {"inicio": "14:00", "fin": "18:00"}],
    "3": [{"inicio": "08:00", "fin": "13:00"}, {"inicio": "14:00", "fin": "18:00"}],
    "4": [{"inicio": "08:00", "fin": "13:00"}, {"inicio": "14:00", "fin": "18:00"}],
    "5": [{"inicio": "08:00", "fin": "11:00"}],
}

DEFAULT_SLA_PRIMERA_RESPUESTA = 30   # minutos
DEFAULT_SLA_RESOLUCION = 24          # horas

DEFAULT_MENSAJES = {
    "bienvenida": "Hola, soy Corby🤖, tu asistente virtual del Grupo Corban. ¿En qué puedo ayudarte hoy?🤗",
    "menu_regreso": "¿En qué más puedo ayudarte? 😊",
    "asesor_asignado": "¡Perfecto! El asesor *{nombre}* se comunicará contigo. 🚀",
    "asesor_asignado_fuera_horario": "¡Perfecto! El asesor *{nombre}* se comunicará contigo. 🚀\n\n{horario}",
    "asesor_existente": "Tu asesor *{nombre}* te atenderá en unos minutos. 👋",
    "cotizar_pedir_req": "Cuéntame, ¿cuáles son tus requerimientos? 😄",
    "cotizar_confirmar": "📝 Recibido. ¿Eso es todo o deseas agregar más detalles?",
    "cotizar_derivado": "¡Perfecto! El asesor *{nombre}* revisará tu cotización y se comunicará contigo. 🚀",
    "carga_lista_asignado": "¡Entendido! El asesor *{nombre}* coordinará la operación contigo. 🚛",
    "despedida": "¡Gracias por comunicarte con Grupo Corban! Fue un placer atenderte. ¡Que tengas un excelente día! 🤗",
    "horario_info": "Recuerda que nuestro horario de atención es de Lunes a Viernes de 8am a 6pm y Sábados de 8am a 11am.",
    "error_ocupados": "En este momento estamos atendiendo a varios clientes. Tu solicitud ha sido registrada y un asesor se comunicará contigo a la brevedad. 🚛",
}

DEFAULT_KEYWORDS = {
    "cotizacion": ["cotizar", "cotización", "cotizacion", "precio", "precios", "cuánto cuesta", "cuanto cuesta", "tarifa", "tarifas", "presupuesto", "costo", "costos"],
    "carga": ["carga", "carga lista", "embarque", "contenedor", "contenedores", "despacho", "despachar", "envío", "envio", "enviar", "importar", "importación", "importacion", "exportar", "exportación", "exportacion", "flete", "fletes", "operación", "operacion"],
}


class BuzonConfigService:
    """Servicio centralizado para la configuración del buzón."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==========================================================
    # HELPERS CONFIGURACIONES
    # ==========================================================

    async def _get_config(self, clave: str) -> str | None:
        """Obtiene valor de una configuración por clave."""
        stmt = select(Configuracion.valor).where(Configuracion.clave == clave)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _set_config(self, clave: str, valor: str, tipo_dato: str = "JSON", categoria: str = "BUZON", descripcion: str = ""):
        """Crea o actualiza una configuración."""
        stmt = select(Configuracion).where(Configuracion.clave == clave)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if config:
            config.valor = valor
        else:
            config = Configuracion(
                clave=clave,
                valor=valor,
                tipo_dato=tipo_dato,
                categoria=categoria,
                descripcion=descripcion,
            )
            self.db.add(config)

        await self.db.commit()

    # ==========================================================
    # 1. DISPONIBILIDAD DE COMERCIALES
    # ==========================================================

    async def get_disponibilidad(self) -> list:
        """Lista comerciales con su estado de disponibilidad y leads pendientes."""
        stmt = (
            select(Usuario)
            .options(
                selectinload(Usuario.roles),
                selectinload(Usuario.empleado)
            )
            .join(Usuario.roles)
            .where(
                Usuario.is_active == True,
                Rol.nombre == "COMERCIAL"
            )
            .distinct()
        )
        result = await self.db.execute(stmt)
        usuarios = result.scalars().all()

        data = []
        for u in usuarios:
            # Contar leads pendientes
            count_stmt = select(func.count()).select_from(Inbox).where(
                and_(Inbox.asignado_a == u.id, Inbox.estado == "PENDIENTE")
            )
            count_result = await self.db.execute(count_stmt)
            leads_pendientes = count_result.scalar() or 0

            data.append({
                "usuario_id": u.id,
                "nombre": f"{u.empleado.nombres} {u.empleado.apellido_paterno}" if u.empleado else u.correo_corp,
                "disponible_buzon": u.disponible_buzon,
                "leads_pendientes": leads_pendientes,
            })

        return data

    async def toggle_disponibilidad(self, usuario_id: int) -> dict:
        """Toggle disponibilidad de un comercial."""
        stmt = select(Usuario).where(Usuario.id == usuario_id, Usuario.is_active == True)
        result = await self.db.execute(stmt)
        usuario = result.scalar_one_or_none()

        if not usuario:
            return {"success": 0, "message": "Usuario no encontrado"}

        usuario.disponible_buzon = not usuario.disponible_buzon
        await self.db.commit()
        await self.db.refresh(usuario)

        return {
            "success": 1,
            "usuario_id": usuario.id,
            "disponible_buzon": usuario.disponible_buzon,
        }

    # ==========================================================
    # 2. MOTIVOS DE DESCARTE (CRUD)
    # ==========================================================

    async def get_motivos_descarte(self) -> list:
        """Lista todos los motivos de descarte."""
        stmt = select(MotivoDescarteInbox).order_by(MotivoDescarteInbox.id)
        result = await self.db.execute(stmt)
        motivos = result.scalars().all()
        return [
            {"id": m.id, "nombre": m.nombre, "is_active": m.is_active}
            for m in motivos
        ]

    async def create_motivo_descarte(self, nombre: str) -> dict:
        """Crea un nuevo motivo de descarte."""
        nuevo = MotivoDescarteInbox(nombre=nombre, is_active=True)
        self.db.add(nuevo)
        await self.db.commit()
        await self.db.refresh(nuevo)
        return {"success": 1, "id": nuevo.id, "message": "Motivo creado"}

    async def update_motivo_descarte(self, id: int, nombre: str) -> dict:
        """Actualiza un motivo de descarte."""
        stmt = select(MotivoDescarteInbox).where(MotivoDescarteInbox.id == id)
        result = await self.db.execute(stmt)
        motivo = result.scalar_one_or_none()
        if not motivo:
            return {"success": 0, "message": "Motivo no encontrado"}

        motivo.nombre = nombre
        await self.db.commit()
        return {"success": 1, "message": "Motivo actualizado"}

    async def toggle_motivo_descarte(self, id: int) -> dict:
        """Activa/desactiva un motivo de descarte."""
        stmt = select(MotivoDescarteInbox).where(MotivoDescarteInbox.id == id)
        result = await self.db.execute(stmt)
        motivo = result.scalar_one_or_none()
        if not motivo:
            return {"success": 0, "message": "Motivo no encontrado"}

        motivo.is_active = not motivo.is_active
        await self.db.commit()
        return {"success": 1, "is_active": motivo.is_active, "message": "Estado actualizado"}

    # ==========================================================
    # 3. HORARIO Y SLA
    # ==========================================================

    async def get_horario(self) -> dict:
        """Obtiene la configuración de horario laboral."""
        raw = await self._get_config(CLAVE_HORARIO_LABORAL)
        return json.loads(raw) if raw else DEFAULT_HORARIO

    async def set_horario(self, horario: dict) -> dict:
        """Actualiza la configuración de horario laboral."""
        await self._set_config(
            CLAVE_HORARIO_LABORAL,
            json.dumps(horario),
            descripcion="Horario laboral del buzón (JSON)"
        )
        return {"success": 1, "message": "Horario actualizado"}

    async def get_sla(self) -> dict:
        """Obtiene umbrales de SLA."""
        resp_raw = await self._get_config(CLAVE_SLA_PRIMERA_RESPUESTA)
        resol_raw = await self._get_config(CLAVE_SLA_RESOLUCION)

        return {
            "primera_respuesta_min": int(resp_raw) if resp_raw else DEFAULT_SLA_PRIMERA_RESPUESTA,
            "resolucion_horas": int(resol_raw) if resol_raw else DEFAULT_SLA_RESOLUCION,
        }

    async def set_sla(self, primera_respuesta_min: int, resolucion_horas: int) -> dict:
        """Actualiza umbrales de SLA."""
        await self._set_config(
            CLAVE_SLA_PRIMERA_RESPUESTA,
            str(primera_respuesta_min),
            tipo_dato="INTEGER",
            descripcion="SLA primera respuesta (minutos)"
        )
        await self._set_config(
            CLAVE_SLA_RESOLUCION,
            str(resolucion_horas),
            tipo_dato="INTEGER",
            descripcion="SLA resolución (horas hábiles)"
        )
        return {"success": 1, "message": "SLA actualizado"}

    # ==========================================================
    # 3b. DÍAS NO LABORABLES
    # ==========================================================

    async def get_dias_no_laborables(self, year: int = None) -> list:
        """Lista días no laborables, opcionalmente filtrados por año."""
        stmt = select(DiaNoLaborable).order_by(DiaNoLaborable.fecha)
        if year:
            from sqlalchemy import extract
            stmt = stmt.where(extract("year", DiaNoLaborable.fecha) == year)

        result = await self.db.execute(stmt)
        dias = result.scalars().all()
        return [
            {"id": d.id, "fecha": d.fecha.isoformat(), "descripcion": d.descripcion}
            for d in dias
        ]

    async def add_dia_no_laborable(self, fecha: date, descripcion: str = None, created_by: int = None) -> dict:
        """Agrega un día no laborable."""
        # Verificar duplicado
        stmt = select(DiaNoLaborable).where(DiaNoLaborable.fecha == fecha)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            return {"success": 0, "message": f"La fecha {fecha} ya está registrada"}

        nuevo = DiaNoLaborable(fecha=fecha, descripcion=descripcion, created_by=created_by)
        self.db.add(nuevo)
        await self.db.commit()
        await self.db.refresh(nuevo)
        return {"success": 1, "id": nuevo.id, "message": "Día no laborable agregado"}

    async def remove_dia_no_laborable(self, id: int) -> dict:
        """Elimina un día no laborable."""
        stmt = select(DiaNoLaborable).where(DiaNoLaborable.id == id)
        result = await self.db.execute(stmt)
        dia = result.scalar_one_or_none()
        if not dia:
            return {"success": 0, "message": "Día no encontrado"}

        await self.db.delete(dia)
        await self.db.commit()
        return {"success": 1, "message": "Día eliminado"}

    # ==========================================================
    # 4. MENSAJES DEL BOT
    # ==========================================================

    async def get_mensajes_bot(self) -> dict:
        """Obtiene los mensajes configurados del bot."""
        raw = await self._get_config(CLAVE_BOT_MENSAJES)
        return json.loads(raw) if raw else DEFAULT_MENSAJES

    async def set_mensajes_bot(self, mensajes: dict) -> dict:
        """Actualiza los mensajes del bot."""
        await self._set_config(
            CLAVE_BOT_MENSAJES,
            json.dumps(mensajes, ensure_ascii=False),
            descripcion="Mensajes del chatbot Corby (JSON)"
        )
        return {"success": 1, "message": "Mensajes actualizados"}

    async def get_keywords_bot(self) -> dict:
        """Obtiene las keywords del bot."""
        raw = await self._get_config(CLAVE_BOT_KEYWORDS)
        return json.loads(raw) if raw else DEFAULT_KEYWORDS

    async def set_keywords_bot(self, keywords: dict) -> dict:
        """Actualiza las keywords del bot."""
        await self._set_config(
            CLAVE_BOT_KEYWORDS,
            json.dumps(keywords, ensure_ascii=False),
            descripcion="Keywords de detección de intención (JSON)"
        )
        return {"success": 1, "message": "Keywords actualizados"}

    # ==========================================================
    # RESUMEN GENERAL (para la vista principal)
    # ==========================================================

    async def get_resumen(self) -> dict:
        """Obtiene un resumen de toda la configuración del buzón."""
        disponibilidad = await self.get_disponibilidad()
        motivos = await self.get_motivos_descarte()
        horario = await self.get_horario()
        sla = await self.get_sla()
        dias = await self.get_dias_no_laborables()
        mensajes = await self.get_mensajes_bot()
        keywords = await self.get_keywords_bot()

        comerciales_activos = sum(1 for d in disponibilidad if d["disponible_buzon"])

        return {
            "disponibilidad": disponibilidad,
            "comerciales_disponibles": comerciales_activos,
            "comerciales_total": len(disponibilidad),
            "motivos_descarte": motivos,
            "horario": horario,
            "sla": sla,
            "dias_no_laborables": dias,
            "mensajes": mensajes,
            "keywords": keywords,
        }
