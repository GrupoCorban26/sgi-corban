"""
Servicio de notificaciones operacionales multicanal (Correo + WhatsApp).

Gestiona el envío de alertas de fecha límite de documentos y confirmaciones
de documentación completa al contacto de alerta del cliente.

WhatsApp queda preparado para cuando se configure el template en Meta Business
y se agreguen WHATSAPP_OPS_TOKEN / WHATSAPP_OPS_PHONE_ID al .env.
"""
import logging
import os
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.comercial.email_service import EmailService
from app.services.comercial.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


# Días de anticipación para entrega de documentos según servicio + carga
DIAS_ANTICIPACION_DOCS: dict[tuple[str, str], int] = {
    ("ADUANA", "FCL"): 7,
    ("ADUANA", "LCL"): 7,
    ("ADUANA", "AEREO"): 4,
    ("INTEGRAL", "FCL"): 7,
    ("INTEGRAL", "LCL"): 7,
    ("INTEGRAL", "AEREO"): 4,
    ("COURIER", "AEREO"): 2,
    ("COURIER", "COURIER"): 2,
}


def calcular_dias_anticipacion(tipo_servicio: str, tipo_carga: str) -> int | None:
    """
    Calcula los días de anticipación para entrega de documentos
    según la combinación tipo_servicio + tipo_carga.

    Retorna None si la combinación no está en la tabla de reglas (ej: CARGA).
    """
    key = (tipo_servicio.upper().strip(), tipo_carga.upper().strip())
    return DIAS_ANTICIPACION_DOCS.get(key)


class NotificacionOperacionalService:
    """
    Servicio para enviar notificaciones operacionales al cliente
    a través de múltiples canales (correo electrónico y WhatsApp).
    """

    def __init__(self, db: AsyncSession = None):
        self.db = db
        self.email_service = EmailService(db)
        self.whatsapp_ops_token = os.getenv("WHATSAPP_OPS_TOKEN")
        self.whatsapp_ops_phone_id = os.getenv("WHATSAPP_OPS_PHONE_ID")
        self.whatsapp_template_alerta = os.getenv("WHATSAPP_TEMPLATE_ALERTA_DOCS", "")
        self.whatsapp_template_confirmacion = os.getenv("WHATSAPP_TEMPLATE_CONFIRMACION_DOCS", "")

    def _whatsapp_configured(self) -> bool:
        """Verifica si las credenciales de WhatsApp operacional están configuradas."""
        return bool(self.whatsapp_ops_token and self.whatsapp_ops_phone_id)

    async def enviar_alerta_fecha_limite(
        self,
        telefono: str | None,
        correo: str | None,
        razon_social: str,
        titulo_embarque: str,
        fecha_limite: date,
        dias_restantes_limite: int,
        fecha_eta: date,
        documentos_pendientes: list[str],
        nombre_contacto: str = "",
        empresa_id: int | None = None
    ) -> str:
        """
        Envía alerta de fecha límite de documentos por correo y WhatsApp.

        Retorna el canal utilizado: 'EMAIL', 'WHATSAPP' o 'AMBOS'.
        """
        canal_usado = []

        # ── Envío por correo ──
        if correo:
            try:
                enviado_email = await self.email_service.enviar_alerta_fecha_limite_documentos(
                    destinatario_email=correo,
                    razon_social=razon_social,
                    titulo_embarque=titulo_embarque,
                    fecha_limite=fecha_limite,
                    dias_restantes_limite=dias_restantes_limite,
                    fecha_eta=fecha_eta,
                    documentos_pendientes=documentos_pendientes,
                    empresa_id=empresa_id
                )
                if enviado_email:
                    canal_usado.append("EMAIL")
            except Exception as e:
                logger.error(f"[NOTIF-OPS] Error enviando correo de alerta a {correo}: {e}", exc_info=True)

        # ── Envío por WhatsApp ──
        if telefono and self._whatsapp_configured() and self.whatsapp_template_alerta:
            try:
                # Formatear número para WhatsApp (agregar código de país si no lo tiene)
                telefono_wa = self._formatear_telefono(telefono)

                await WhatsAppService.send_template(
                    to=telefono_wa,
                    template_name=self.whatsapp_template_alerta,
                    language="es",
                    parameters=[
                        nombre_contacto or razon_social,
                        titulo_embarque,
                        fecha_limite.strftime("%d/%m/%Y"),
                        str(dias_restantes_limite),
                        ", ".join(documentos_pendientes[:5])  # Max 5 docs en el mensaje
                    ],
                    token=self.whatsapp_ops_token,
                    phone_id=self.whatsapp_ops_phone_id
                )
                canal_usado.append("WHATSAPP")
                logger.info(f"[NOTIF-OPS] WhatsApp enviado a {telefono_wa}")
            except Exception as e:
                logger.error(f"[NOTIF-OPS] Error enviando WhatsApp a {telefono}: {e}", exc_info=True)
        elif telefono and not self._whatsapp_configured():
            logger.debug(
                "[NOTIF-OPS] WhatsApp operacional no configurado. "
                "Configure WHATSAPP_OPS_TOKEN y WHATSAPP_OPS_PHONE_ID en .env"
            )

        if not canal_usado:
            logger.warning(
                f"[NOTIF-OPS] No se pudo enviar ninguna alerta para '{titulo_embarque}' "
                f"(correo={correo}, tel={telefono})"
            )
            return ""

        return "AMBOS" if len(canal_usado) == 2 else canal_usado[0]

    async def enviar_confirmacion_docs_completos(
        self,
        telefono: str | None,
        correo: str | None,
        razon_social: str,
        titulo_embarque: str,
        nombre_contacto: str = "",
        empresa_id: int | None = None
    ) -> str:
        """
        Envía confirmación de documentos completos por correo y WhatsApp.

        Retorna el canal utilizado: 'EMAIL', 'WHATSAPP' o 'AMBOS'.
        """
        canal_usado = []

        # ── Envío por correo ──
        if correo:
            try:
                enviado_email = await self.email_service.enviar_confirmacion_documentos_completos(
                    destinatario_email=correo,
                    razon_social=razon_social,
                    titulo_embarque=titulo_embarque,
                    empresa_id=empresa_id
                )
                if enviado_email:
                    canal_usado.append("EMAIL")
            except Exception as e:
                logger.error(f"[NOTIF-OPS] Error enviando correo de confirmación a {correo}: {e}", exc_info=True)

        # ── Envío por WhatsApp ──
        if telefono and self._whatsapp_configured() and self.whatsapp_template_confirmacion:
            try:
                telefono_wa = self._formatear_telefono(telefono)

                await WhatsAppService.send_template(
                    to=telefono_wa,
                    template_name=self.whatsapp_template_confirmacion,
                    language="es",
                    parameters=[
                        nombre_contacto or razon_social,
                        titulo_embarque
                    ],
                    token=self.whatsapp_ops_token,
                    phone_id=self.whatsapp_ops_phone_id
                )
                canal_usado.append("WHATSAPP")
                logger.info(f"[NOTIF-OPS] WhatsApp confirmación enviado a {telefono_wa}")
            except Exception as e:
                logger.error(f"[NOTIF-OPS] Error enviando WhatsApp confirmación a {telefono}: {e}", exc_info=True)

        if not canal_usado:
            return ""

        return "AMBOS" if len(canal_usado) == 2 else canal_usado[0]

    @staticmethod
    def _formatear_telefono(telefono: str) -> str:
        """
        Formatea un número de teléfono para la API de WhatsApp.
        Si no tiene código de país, asume Perú (+51).
        """
        # Limpiar caracteres no numéricos
        limpio = "".join(c for c in telefono if c.isdigit())

        # Si ya tiene código de país (más de 9 dígitos), retornar como está
        if len(limpio) > 9:
            return limpio

        # Asumir código de país Perú
        return f"51{limpio}"
