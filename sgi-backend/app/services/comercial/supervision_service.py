"""
Servicio de Supervisión WhatsApp — Integración con Evolution API v2.

Responsabilidades:
  - CRUD de instancias (crear, eliminar, listar, obtener QR)
  - Procesar webhooks entrantes (mensajes, conexión, QR)
  - Consultar conversaciones y mensajes para la vista de supervisión
  - RBAC: cada jefe solo ve las instancias de su equipo
"""
import logging
import httpx
from typing import Optional, List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, delete
from sqlalchemy.orm import selectinload

from app.models.whatsapp_supervision import EvoInstancia, EvoConversacion, EvoMensaje
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.core.settings import get_settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Configuración Evolution API
# ─────────────────────────────────────────────
EVOLUTION_API_URL = "http://localhost:8080"
EVOLUTION_API_KEY = "sgi_evo_dev_key_2026"


class SupervisionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        settings = get_settings()
        self.evo_url = getattr(settings, "EVOLUTION_API_URL", EVOLUTION_API_URL)
        self.evo_key = getattr(settings, "EVOLUTION_API_KEY", EVOLUTION_API_KEY)

    # ═══════════════════════════════════════════
    #  INSTANCIAS
    # ═══════════════════════════════════════════

    async def obtener_instancia_por_usuario(self, usuario_id: int):
        """Retorna la instancia de un usuario específico (para vista del comercial)."""
        result = await self.db.execute(
            select(EvoInstancia).where(EvoInstancia.usuario_id == usuario_id)
        )
        return result.scalar_one_or_none()

    async def crear_instancia(self, usuario_id: int, created_by: int) -> dict:
        """
        Crea una instancia en Evolution API y la registra en BD.
        Nombre de instancia: 'sgi_comercial_{usuario_id}'
        
        Flujo Evolution API v2:
          1. POST /instance/create → crea la instancia
          2. GET /instance/connect/{name} → dispara generación del QR
          3. El QR llega por webhook (qrcode.updated) y se guarda en BD
        """
        # Validar que el usuario existe y no tiene instancia
        existing = await self.db.execute(
            select(EvoInstancia).where(EvoInstancia.usuario_id == usuario_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"El usuario {usuario_id} ya tiene una instancia activa")

        # Obtener nombre del comercial para referencia
        user_result = await self.db.execute(
            select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == usuario_id)
        )
        usuario = user_result.scalar_one_or_none()
        if not usuario:
            raise ValueError(f"Usuario {usuario_id} no encontrado")

        instance_name = f"sgi_comercial_{usuario_id}"

        qr_base64 = None
        instance_id = None
        token = None

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Paso 1: Crear instancia
            response = await client.post(
                f"{self.evo_url}/instance/create",
                headers={"apikey": self.evo_key, "Content-Type": "application/json"},
                json={
                    "instanceName": instance_name,
                    "integration": "WHATSAPP-BAILEYS",
                    "qrcode": True,
                },
            )
            if response.status_code not in (200, 201):
                error_detail = response.text
                logger.error(f"Error creando instancia en Evolution API: {error_detail}")
                raise RuntimeError(f"Error en Evolution API: {response.status_code}")

            evo_data = response.json()
            logger.info(f"Evolution API create response keys: {list(evo_data.keys())}")

            instance_id = evo_data.get("instance", {}).get("instanceId")
            token = evo_data.get("hash")

            # Extraer QR si viene en la respuesta del create
            qr_obj = evo_data.get("qrcode")
            if isinstance(qr_obj, dict):
                qr_base64 = qr_obj.get("base64")
            elif isinstance(qr_obj, str) and qr_obj.startswith("data:"):
                qr_base64 = qr_obj

            # Paso 2: Si no hay QR, forzar connect
            if not qr_base64:
                try:
                    import asyncio
                    await asyncio.sleep(2)  # Esperar que la instancia se inicialice
                    connect_resp = await client.get(
                        f"{self.evo_url}/instance/connect/{instance_name}",
                        headers={"apikey": self.evo_key},
                    )
                    if connect_resp.status_code == 200:
                        connect_data = connect_resp.json()
                        qr_base64 = connect_data.get("base64")
                        logger.info(f"Connect response keys: {list(connect_data.keys())}")
                except Exception as e:
                    logger.warning(f"Error en connect post-create: {e}")

        # Registrar en BD
        instancia = EvoInstancia(
            instance_name=instance_name,
            instance_id=instance_id,
            token=token,
            usuario_id=usuario_id,
            estado="CONECTANDO",
            qr_code=qr_base64,  # Guardar QR si lo obtuvimos
            created_by=created_by,
        )
        self.db.add(instancia)
        await self.db.commit()
        await self.db.refresh(instancia)

        logger.info(f"Instancia '{instance_name}' creada para usuario {usuario_id} (QR: {'SI' if qr_base64 else 'pendiente webhook'})")

        return {
            "id": instancia.id,
            "instance_name": instance_name,
            "instance_id": instancia.instance_id,
            "estado": instancia.estado,
            "message": "Instancia creada. Escanea el QR para conectar.",
        }

    async def eliminar_instancia(self, instancia_id: int) -> bool:
        """Elimina una instancia de Evolution API y de la BD."""
        instancia = await self.db.get(EvoInstancia, instancia_id)
        if not instancia:
            raise ValueError("Instancia no encontrada")

        # Eliminar de Evolution API
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.delete(
                    f"{self.evo_url}/instance/delete/{instancia.instance_name}",
                    headers={"apikey": self.evo_key},
                )
                if response.status_code not in (200, 201, 404):
                    logger.warning(
                        f"Error eliminando instancia de Evolution API: {response.text}"
                    )
        except Exception as e:
            logger.warning(f"No se pudo contactar Evolution API al eliminar: {e}")

        # Eliminar de BD (cascade elimina conversaciones y mensajes)
        await self.db.delete(instancia)
        await self.db.commit()

        logger.info(f"Instancia '{instancia.instance_name}' eliminada")
        return True

    async def listar_instancias(self, comercial_ids: Optional[List[int]] = None) -> list:
        """
        Lista instancias filtradas por equipo (RBAC).
        Si comercial_ids es None, retorna todas (admin/gerencia).
        """
        query = (
            select(
                EvoInstancia,
                Empleado.nombres,
                Empleado.apellido_paterno,
                func.count(EvoConversacion.id.distinct()).label("total_conversaciones"),
                func.count(EvoMensaje.id).label("total_mensajes"),
            )
            .join(Usuario, EvoInstancia.usuario_id == Usuario.id)
            .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
            .outerjoin(EvoConversacion, EvoConversacion.instancia_id == EvoInstancia.id)
            .outerjoin(EvoMensaje, EvoMensaje.instancia_id == EvoInstancia.id)
            .group_by(
                EvoInstancia.id,
                EvoInstancia.instance_name,
                EvoInstancia.instance_id,
                EvoInstancia.token,
                EvoInstancia.usuario_id,
                EvoInstancia.telefono,
                EvoInstancia.estado,
                EvoInstancia.qr_code,
                EvoInstancia.profile_name,
                EvoInstancia.profile_pic_url,
                EvoInstancia.last_seen,
                EvoInstancia.created_at,
                EvoInstancia.created_by,
                Empleado.nombres,
                Empleado.apellido_paterno,
            )
        )

        if comercial_ids is not None:
            query = query.where(EvoInstancia.usuario_id.in_(comercial_ids))

        query = query.order_by(EvoInstancia.estado.desc(), EvoInstancia.instance_name)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "id": inst.id,
                "instance_name": inst.instance_name,
                "instance_id": inst.instance_id,
                "usuario_id": inst.usuario_id,
                "nombre_comercial": (
                    f"{nombres} {apellido}" if nombres else None
                ),
                "telefono": inst.telefono,
                "estado": inst.estado,
                "profile_name": inst.profile_name,
                "profile_pic_url": inst.profile_pic_url,
                "last_seen": inst.last_seen,
                "created_at": inst.created_at,
                "total_conversaciones": total_conv,
                "total_mensajes": total_msg,
            }
            for inst, nombres, apellido, total_conv, total_msg in rows
        ]

    async def obtener_qr(self, instancia_id: int) -> dict:
        """Obtiene el QR code actual de una instancia.
        
        En Evolution API v2, el QR no se devuelve en la respuesta de /instance/connect.
        Se genera asíncronamente y llega por webhook (qrcode.updated).
        Este método:
          1. Dispara /instance/connect para iniciar la generación del QR
          2. Retorna el QR cacheado en BD (guardado por el webhook handler)
        """
        instancia = await self.db.get(EvoInstancia, instancia_id)
        if not instancia:
            raise ValueError("Instancia no encontrada")

        # Si ya está conectada, no necesita QR
        if instancia.estado == "CONECTADO":
            return {
                "instance_name": instancia.instance_name,
                "estado": "CONECTADO",
                "qr_code": None,
                "message": "La instancia ya está conectada",
            }

        # Disparar /instance/connect para que Evolution API genere el QR
        # (el QR llegará por webhook qrcode.updated)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.evo_url}/instance/connect/{instancia.instance_name}",
                    headers={"apikey": self.evo_key},
                )
                if response.status_code == 200:
                    data = response.json()
                    # En algunas versiones sí viene el base64 directo
                    qr_from_api = data.get("base64")
                    if qr_from_api:
                        instancia.qr_code = qr_from_api
                        instancia.estado = "CONECTANDO"
                        await self.db.commit()
        except Exception as e:
            logger.warning(f"Error al disparar connect en Evolution API: {e}")

        # Retornar QR cacheado (guardado por webhook qrcode.updated)
        # Refrescar instancia para obtener el QR más reciente del webhook
        await self.db.refresh(instancia)
        
        return {
            "instance_name": instancia.instance_name,
            "estado": instancia.estado,
            "qr_code": instancia.qr_code,
            "message": "Escanea este QR con WhatsApp" if instancia.qr_code else "Generando QR, espera unos segundos...",
        }

    # ═══════════════════════════════════════════
    #  WEBHOOK PROCESSOR
    # ═══════════════════════════════════════════

    async def procesar_webhook(self, payload: dict) -> dict:
        """
        Procesa un webhook entrante de Evolution API.
        Eventos soportados:
          - connection.update  → Actualizar estado de conexión
          - qrcode.updated     → Actualizar QR code
          - messages.upsert    → Guardar mensaje nuevo
          - send.message       → Guardar mensaje enviado por el comercial
        """
        event = payload.get("event", "")
        instance_name = payload.get("instance", "")

        # DEBUG: log cada evento entrante para diagnóstico
        data_keys = list(payload.get("data", {}).keys())
        logger.info(f"📩 WEBHOOK → event={event}, instance={instance_name}, data_keys={data_keys}")

        if not instance_name:
            logger.warning("Webhook sin instance_name, ignorando")
            return {"status": "ignored", "reason": "no instance_name"}

        # Buscar la instancia en BD
        result = await self.db.execute(
            select(EvoInstancia).where(EvoInstancia.instance_name == instance_name)
        )
        instancia = result.scalar_one_or_none()

        if not instancia:
            logger.debug(f"Webhook para instancia no registrada: {instance_name}")
            return {"status": "ignored", "reason": "instance not registered"}

        data = payload.get("data", {})

        if event == "connection.update":
            return await self._handle_connection_update(instancia, data)
        elif event == "qrcode.updated":
            return await self._handle_qr_update(instancia, data)
        elif event in ("messages.upsert", "send.message"):
            return await self._handle_message(instancia, data, event)
        elif event == "messages.update":
            return {"status": "ignored", "reason": "messages.update not tracked"}
        else:
            logger.debug(f"Evento no manejado: {event}")
            return {"status": "ignored", "reason": f"unhandled event: {event}"}

    async def _handle_connection_update(self, instancia: EvoInstancia, data: dict) -> dict:
        """Actualiza estado de conexión de la instancia."""
        state = data.get("state", "")
        status_reason = data.get("statusReason")

        logger.info(
            f"🔌 connection.update → instance={instancia.instance_name}, "
            f"state={state}, statusReason={status_reason}, "
            f"data_types={{k: type(v).__name__ for k, v in data.items()}}"
        )

        # Mapear estado de Evolution API a estado interno
        new_estado = {
            "open": "CONECTADO",
            "close": "DESCONECTADO",
            "connecting": "CONECTANDO",
        }.get(state)

        if not new_estado:
            return {"status": "ignored", "reason": f"unknown state: {state}"}

        # Si el estado no cambió, no hacer nada (evita spam de logs y commits)
        if instancia.estado == new_estado:
            return {"status": "ignored", "reason": "state unchanged"}

        old_estado = instancia.estado
        instancia.estado = new_estado

        if new_estado == "CONECTADO":
            instancia.qr_code = None  # Limpiar QR temporal
            instancia.last_seen = datetime.utcnow()

            # Evolution API v2 envía data["instance"] como string (nombre),
            # NO como dict con profileName. Buscar perfil via API.
            instance_data = data.get("instance")
            if isinstance(instance_data, dict):
                # Por si alguna versión lo envía como dict
                instancia.profile_name = instance_data.get("profileName")
                instancia.profile_pic_url = instance_data.get("profilePictureUrl")
                owner_jid = instance_data.get("wuid") or instance_data.get("owner")
                if owner_jid:
                    instancia.telefono = owner_jid.split("@")[0] if "@" in owner_jid else owner_jid
            else:
                # Obtener datos de perfil desde la API de Evolution directamente
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(
                            f"{self.evo_url}/instance/fetchInstances",
                            headers={"apikey": self.evo_key},
                            params={"instanceName": instancia.instance_name},
                        )
                        if resp.status_code == 200:
                            instances = resp.json()
                            if isinstance(instances, list) and instances:
                                inst_info = instances[0].get("instance", {})
                                instancia.profile_name = inst_info.get("profileName")
                                instancia.profile_pic_url = inst_info.get("profilePictureUrl")
                                owner_jid = inst_info.get("owner")
                                if owner_jid:
                                    instancia.telefono = (
                                        owner_jid.split("@")[0]
                                        if "@" in owner_jid
                                        else owner_jid
                                    )
                                logger.info(
                                    f"Perfil obtenido via API: name={instancia.profile_name}, "
                                    f"tel={instancia.telefono}"
                                )
                except Exception as e:
                    logger.warning(f"No se pudo obtener perfil desde Evolution API: {e}")

        elif new_estado == "DESCONECTADO":
            logger.info(
                f"Instancia {instancia.instance_name} desconectada. "
                f"Razón: {status_reason}"
            )

        await self.db.commit()
        logger.info(f"Conexión actualizada: {instancia.instance_name} → {old_estado} → {new_estado}")
        return {"status": "processed", "event": "connection.update", "state": new_estado}

    async def _handle_qr_update(self, instancia: EvoInstancia, data: dict) -> dict:
        """Actualiza QR code cacheado."""
        # Evolution API v2 envía el QR en diferentes formatos según la versión
        # Intentar todas las ubicaciones posibles
        qr_base64 = None
        
        # Formato 1: data.qrcode.base64 (dict)
        if isinstance(data.get("qrcode"), dict):
            qr_base64 = data["qrcode"].get("base64")
        # Formato 2: data.qrcode (string directo)
        elif isinstance(data.get("qrcode"), str) and data["qrcode"].startswith("data:"):
            qr_base64 = data["qrcode"]
        # Formato 3: data.base64 (nivel raíz)
        elif data.get("base64"):
            qr_base64 = data["base64"]

        if qr_base64:
            instancia.qr_code = qr_base64
            instancia.estado = "CONECTANDO"
            await self.db.commit()
            logger.info(f"QR actualizado para {instancia.instance_name} ({len(qr_base64)} chars)")
        else:
            logger.warning(
                f"Webhook qrcode.updated sin base64 para {instancia.instance_name}. "
                f"Keys en data: {list(data.keys())}. "
                f"Tipo qrcode: {type(data.get('qrcode')).__name__}"
            )

        return {"status": "processed", "event": "qrcode.updated"}

    async def _handle_message(self, instancia: EvoInstancia, data: dict, event: str) -> dict:
        """Procesa y guarda un mensaje nuevo."""
        # Extraer datos del mensaje según la estructura de Evolution API v2
        key = data.get("key", {})
        message_id = key.get("id")
        remote_jid = key.get("remoteJid", "")
        from_me = key.get("fromMe", False)
        participant = key.get("participant")

        if not message_id or not remote_jid:
            return {"status": "ignored", "reason": "incomplete message data"}

        # Ignorar mensajes de status@broadcast
        if remote_jid == "status@broadcast":
            return {"status": "ignored", "reason": "status broadcast"}

        message_obj = data.get("message", {})
        
        # Manejar reacción directamente
        if "reactionMessage" in message_obj:
            emoji = message_obj["reactionMessage"].get("text", "")
            target_id = message_obj["reactionMessage"].get("key", {}).get("id")
            if target_id:
                msg_result = await self.db.execute(select(EvoMensaje).where(EvoMensaje.message_id == target_id))
                orig_msg = msg_result.scalar_one_or_none()
                if orig_msg:
                    orig_msg.reaccion = emoji if emoji else None
                    await self.db.commit()
                return {"status": "processed", "event": "reaction", "target_id": target_id}

        # Verificar duplicado
        existing_msg = await self.db.execute(
            select(EvoMensaje.id).where(EvoMensaje.message_id == message_id)
        )
        if existing_msg.scalar_one_or_none():
            return {"status": "ignored", "reason": "duplicate message"}

        # Determinar tipo y contenido
        message_obj = data.get("message", {})
        tipo, contenido, media_url, media_mime = self._parse_message_content(message_obj)

        # Push name del remitente
        push_name = data.get("pushName")

        # Timestamp
        msg_timestamp = data.get("messageTimestamp")
        if isinstance(msg_timestamp, (int, float)):
            from datetime import timezone
            timestamp = datetime.utcfromtimestamp(msg_timestamp).replace(tzinfo=timezone.utc)
        else:
            from datetime import timezone
            timestamp = datetime.now(timezone.utc)

        # Obtener o crear conversación
        es_grupo = "@g.us" in remote_jid
        conversacion = await self._get_or_create_conversacion(
            instancia_id=instancia.id,
            remote_jid=remote_jid,
            nombre_contacto=push_name if not es_grupo else None,
            es_grupo=es_grupo,
        )

        # Crear mensaje
        mensaje = EvoMensaje(
            conversacion_id=conversacion.id,
            instancia_id=instancia.id,
            message_id=message_id,
            from_me=from_me,
            participant=participant,
            participant_name=push_name if es_grupo and participant else None,
            tipo=tipo,
            contenido=contenido,
            media_url=media_url,
            media_mimetype=media_mime,
            timestamp=timestamp,
        )
        self.db.add(mensaje)

        # Actualizar conversación
        preview = contenido[:500] if contenido else f"[{tipo}]"
        conversacion.ultimo_mensaje = preview
        conversacion.ultimo_mensaje_at = timestamp
        if not from_me:
            conversacion.mensajes_no_leidos = (conversacion.mensajes_no_leidos or 0) + 1
        if push_name and not conversacion.nombre_contacto and not es_grupo:
            conversacion.nombre_contacto = push_name

        # Actualizar last_seen de instancia
        instancia.last_seen = datetime.utcnow()

        await self.db.commit()

        return {
            "status": "processed",
            "event": event,
            "message_id": message_id,
            "conversacion_id": conversacion.id,
        }

    def _parse_message_content(self, message: dict) -> tuple:
        """
        Extrae tipo, contenido, media_url y media_mimetype del objeto message.
        Retorna (tipo, contenido, media_url, media_mimetype)
        """
        if not message:
            return "text", None, None, None

        # Texto simple
        if "conversation" in message:
            return "text", message["conversation"], None, None

        # Texto extendido (con URL preview, quoted, etc)
        if "extendedTextMessage" in message:
            return "text", message["extendedTextMessage"].get("text", ""), None, None

        # Imagen
        if "imageMessage" in message:
            img = message["imageMessage"]
            caption = img.get("caption", "")
            return "image", caption or "[Imagen]", img.get("url"), img.get("mimetype")

        # Audio
        if "audioMessage" in message:
            audio = message["audioMessage"]
            return "audio", "[Audio]", audio.get("url"), audio.get("mimetype")

        # Video
        if "videoMessage" in message:
            video = message["videoMessage"]
            caption = video.get("caption", "")
            return "video", caption or "[Video]", video.get("url"), video.get("mimetype")

        # Documento
        if "documentMessage" in message:
            doc = message["documentMessage"]
            filename = doc.get("fileName", "documento")
            return "document", f"[Documento: {filename}]", doc.get("url"), doc.get("mimetype")

        # Sticker
        if "stickerMessage" in message:
            return "sticker", "[Sticker]", None, None

        # Contacto
        if "contactMessage" in message:
            name = message["contactMessage"].get("displayName", "")
            return "text", f"[Contacto: {name}]", None, None

        # Ubicación
        if "locationMessage" in message:
            loc = message["locationMessage"]
            lat = loc.get("degreesLatitude", "")
            lng = loc.get("degreesLongitude", "")
            return "text", f"[Ubicación: {lat}, {lng}]", None, None

        # Reacciones (ignorar contenido, solo registrar)
        if "reactionMessage" in message:
            emoji = message["reactionMessage"].get("text", "")
            return "text", f"[Reacción: {emoji}]", None, None

        # Fallback
        return "text", "[Mensaje no soportado]", None, None

    async def _get_or_create_conversacion(
        self,
        instancia_id: int,
        remote_jid: str,
        nombre_contacto: Optional[str] = None,
        es_grupo: bool = False,
    ) -> EvoConversacion:
        """Obtiene o crea una conversación para un remote_jid."""
        result = await self.db.execute(
            select(EvoConversacion).where(
                and_(
                    EvoConversacion.instancia_id == instancia_id,
                    EvoConversacion.remote_jid == remote_jid,
                )
            )
        )
        conv = result.scalar_one_or_none()

        if not conv:
            if es_grupo:
                # Intentar obtener el nombre del grupo de Evolution API
                try:
                    inst_result = await self.db.execute(select(EvoInstancia.instance_name).where(EvoInstancia.id == instancia_id))
                    instance_name = inst_result.scalar_one_or_none()
                    if instance_name:
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            resp = await client.get(
                                f"{self.evo_url}/group/findGroupInfos/{instance_name}",
                                headers={"apikey": self.evo_key},
                                params={"groupJid": remote_jid}
                            )
                            if resp.status_code == 200:
                                data = resp.json()
                                subject = data.get("subject")
                                if subject:
                                    nombre_contacto = subject
                except Exception as e:
                    logger.warning(f"No se pudo obtener la info del grupo {remote_jid}: {e}")

            conv = EvoConversacion(
                instancia_id=instancia_id,
                remote_jid=remote_jid,
                nombre_contacto=nombre_contacto,
                es_grupo=es_grupo,
            )
            self.db.add(conv)
            await self.db.flush()  # Para obtener el ID sin commit
        
        elif es_grupo and not conv.nombre_contacto:
            # Si el grupo ya existía pero no tenía nombre, intentar recuperarlo
            try:
                inst_result = await self.db.execute(select(EvoInstancia.instance_name).where(EvoInstancia.id == instancia_id))
                instance_name = inst_result.scalar_one_or_none()
                if instance_name:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(
                            f"{self.evo_url}/group/findGroupInfos/{instance_name}",
                            headers={"apikey": self.evo_key},
                            params={"groupJid": remote_jid}
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            subject = data.get("subject")
                            if subject:
                                conv.nombre_contacto = subject
                                await self.db.flush()
            except Exception as e:
                logger.warning(f"No se pudo actualizar el nombre del grupo {remote_jid}: {e}")

        return conv

    # ═══════════════════════════════════════════
    #  CONSULTAS DE SUPERVISIÓN
    # ═══════════════════════════════════════════

    async def listar_conversaciones(
        self,
        instancia_id: int,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """Lista conversaciones de un comercial, ordenadas por último mensaje."""
        # Verificar que la instancia existe
        instancia = await self.db.get(EvoInstancia, instancia_id)
        if not instancia:
            raise ValueError("Instancia no encontrada")

        # Total
        total_result = await self.db.execute(
            select(func.count()).select_from(EvoConversacion).where(
                EvoConversacion.instancia_id == instancia_id
            )
        )
        total = total_result.scalar() or 0

        # Paginado
        offset = (page - 1) * page_size
        query = (
            select(EvoConversacion)
            .where(EvoConversacion.instancia_id == instancia_id)
            .order_by(EvoConversacion.ultimo_mensaje_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        items = result.scalars().all()

        return {"items": items, "total": total}

    async def listar_mensajes(
        self,
        conversacion_id: int,
        page: int = 1,
        page_size: int = 100,
    ) -> dict:
        """Lista mensajes de una conversación, del más reciente al más antiguo."""
        # Total
        total_result = await self.db.execute(
            select(func.count()).select_from(EvoMensaje).where(
                EvoMensaje.conversacion_id == conversacion_id
            )
        )
        total = total_result.scalar() or 0

        # Paginado (mensajes recientes primero)
        offset = (page - 1) * page_size
        query = (
            select(EvoMensaje)
            .where(EvoMensaje.conversacion_id == conversacion_id)
            .order_by(EvoMensaje.timestamp.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        items = result.scalars().all()

        # Marcar como leídos
        conv = await self.db.get(EvoConversacion, conversacion_id)
        if conv and conv.mensajes_no_leidos > 0:
            conv.mensajes_no_leidos = 0
            await self.db.commit()

        return {"items": items, "total": total}

    async def verificar_acceso_instancia(
        self, instancia_id: int, comercial_ids: Optional[List[int]]
    ) -> bool:
        """Verifica que el usuario tiene acceso a la instancia (RBAC)."""
        if comercial_ids is None:
            return True  # Admin/Gerencia ve todo

        instancia = await self.db.get(EvoInstancia, instancia_id)
        if not instancia:
            return False

        return instancia.usuario_id in comercial_ids

    async def verificar_acceso_conversacion(
        self, conversacion_id: int, comercial_ids: Optional[List[int]]
    ) -> bool:
        """Verifica que el usuario tiene acceso a la conversación (RBAC)."""
        if comercial_ids is None:
            return True

        result = await self.db.execute(
            select(EvoConversacion.instancia_id).where(
                EvoConversacion.id == conversacion_id
            )
        )
        instancia_id = result.scalar_one_or_none()
        if not instancia_id:
            return False

        return await self.verificar_acceso_instancia(instancia_id, comercial_ids)
