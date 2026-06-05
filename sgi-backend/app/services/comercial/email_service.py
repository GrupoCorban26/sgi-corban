"""
Servicio de envío de correos para alertas de documentos operacionales.
Utiliza SMTP con plantillas HTML Jinja2 profesionales.

Las plantillas HTML se encuentran en: app/templates/emails/
"""
import asyncio
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

# Directorio de plantillas relativo a este archivo
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"


class EmailService:
    """Servicio de envío de correos electrónicos para el módulo de seguimiento de cargas."""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_sender = os.getenv("SMTP_SENDER", self.smtp_user)
        self.empresa_nombre = os.getenv("EMPRESA_NOMBRE", "Grupo Corban")

        # Inicializar Jinja2
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def _is_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    def _render_template(self, template_name: str, **kwargs) -> str:
        """Renderiza una plantilla HTML con las variables proporcionadas."""
        template = self.jinja_env.get_template(template_name)
        return template.render(empresa_nombre=self.empresa_nombre, **kwargs)

    def _send_email_sync(self, destinatario: str, subject: str, html_body: str) -> bool:
        """Envío síncrono del correo vía SMTP. Se ejecuta en un thread."""
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.smtp_sender
            msg["To"] = destinatario
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_sender, destinatario, msg.as_string())

            logger.info(f"Correo enviado exitosamente a {destinatario}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Error enviando correo a {destinatario}: {e}", exc_info=True)
            return False

    async def _send_email(self, destinatario: str, subject: str, html_body: str) -> bool:
        """Wrapper async que ejecuta el envío en un thread para no bloquear el event loop."""
        if not self._is_configured():
            logger.warning("SMTP no configurado. No se puede enviar correo. Configure SMTP_HOST, SMTP_USER y SMTP_PASSWORD en .env")
            return False
        return await asyncio.to_thread(self._send_email_sync, destinatario, subject, html_body)

    async def enviar_alerta_documentos_pendientes(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str,
        dias_restantes: int,
        fecha_eta: date,
        documentos_pendientes: list[str]
    ) -> bool:
        """Envía alerta al cliente sobre documentos pendientes antes del ETA."""

        urgencia_color = "#dc2626" if dias_restantes <= 7 else "#f59e0b" if dias_restantes <= 10 else "#3b82f6"
        urgencia_texto = "URGENTE" if dias_restantes <= 7 else "IMPORTANTE" if dias_restantes <= 10 else "RECORDATORIO"

        html = self._render_template(
            "alerta_documentos_pendientes.html",
            urgencia_color=urgencia_color,
            urgencia_texto=urgencia_texto,
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
            fecha_eta=fecha_eta.strftime('%d/%m/%Y'),
            dias_restantes=dias_restantes,
            documentos_pendientes=documentos_pendientes,
        )

        subject = f"[{urgencia_texto}] Documentos pendientes - {titulo_embarque} (ETA: {fecha_eta.strftime('%d/%m/%Y')})"
        return await self._send_email(destinatario_email, subject, html)

    async def enviar_confirmacion_documentos_completos(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str
    ) -> bool:
        """Envía confirmación al cliente de que todos los documentos han sido recibidos."""

        html = self._render_template(
            "confirmacion_documentos_completos.html",
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
        )

        subject = f"Documentos recibidos - {titulo_embarque}"
        return await self._send_email(destinatario_email, subject, html)

    async def enviar_alerta_fecha_limite_documentos(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str,
        fecha_limite: date,
        dias_restantes_limite: int,
        fecha_eta: date,
        documentos_pendientes: list[str]
    ) -> bool:
        """Envía alerta al cliente sobre la fecha límite para entregar documentos."""

        if dias_restantes_limite <= 1:
            urgencia_color = "#dc2626"
            urgencia_texto = "ÚLTIMO DÍA" if dias_restantes_limite == 1 else "PLAZO VENCIDO"
            urgencia_icono = "&#x1F6A8;"
        elif dias_restantes_limite <= 3:
            urgencia_color = "#ea580c"
            urgencia_texto = "URGENTE"
            urgencia_icono = "&#x26A0;"
        elif dias_restantes_limite <= 6:
            urgencia_color = "#f59e0b"
            urgencia_texto = "IMPORTANTE"
            urgencia_icono = "&#x23F0;"
        else:
            urgencia_color = "#3b82f6"
            urgencia_texto = "RECORDATORIO"
            urgencia_icono = "&#x1F4CB;"

        html = self._render_template(
            "alerta_fecha_limite_documentos.html",
            urgencia_color=urgencia_color,
            urgencia_texto=urgencia_texto,
            urgencia_icono=urgencia_icono,
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
            fecha_limite=fecha_limite.strftime('%d/%m/%Y'),
            dias_restantes_limite=dias_restantes_limite,
            fecha_eta=fecha_eta.strftime('%d/%m/%Y'),
            documentos_pendientes=documentos_pendientes,
        )

        subject = f"[{urgencia_texto}] Fecha límite de documentos - {titulo_embarque} (Límite: {fecha_limite.strftime('%d/%m/%Y')})"
        return await self._send_email(destinatario_email, subject, html)
