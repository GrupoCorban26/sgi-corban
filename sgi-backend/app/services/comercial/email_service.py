"""
Servicio de envío de correos para alertas de documentos operacionales.
Utiliza SMTP con plantillas HTML Jinja2 profesionales.

Las plantillas HTML se encuentran en: app/templates/emails/
Los logos de empresa se embeben como adjuntos CID (Content-ID) para
garantizar visualización en cualquier cliente de correo, sin depender
de que el servidor backend sea accesible públicamente.
"""
import asyncio
import logging
import mimetypes
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

# Directorio de plantillas relativo a este archivo
TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates" / "emails"

# Directorio raíz del backend (donde están uploads/)
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class EmailService:
    """Servicio de envío de correos electrónicos para el módulo de seguimiento de cargas."""

    def __init__(self, db: AsyncSession = None):
        self.db = db
        # Credenciales por defecto desde variables de entorno (fallback)
        self.default_smtp_host = os.getenv("SMTP_HOST", "")
        self.default_smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.default_smtp_user = os.getenv("SMTP_USER", "")
        self.default_smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.default_smtp_sender = os.getenv("SMTP_SENDER", self.default_smtp_user)
        self.default_empresa_nombre = os.getenv("EMPRESA_NOMBRE", "Grupo Corban")

        # Inicializar Jinja2
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def _render_template(self, template_name: str, empresa_nombre: str, **kwargs) -> str:
        """Renderiza una plantilla HTML con las variables proporcionadas."""
        template = self.jinja_env.get_template(template_name)
        return template.render(empresa_nombre=empresa_nombre, **kwargs)

    async def _resolve_empresa_smtp(self, empresa_id: int | None) -> tuple[dict, str]:
        """Obtiene la configuración SMTP y el nombre de la empresa desde la base de datos o fallback a .env."""
        from app.models.core import Empresa

        smtp_config = {
            "host": self.default_smtp_host,
            "port": self.default_smtp_port,
            "user": self.default_smtp_user,
            "password": self.default_smtp_password,
            "sender": self.default_smtp_sender,
        }
        empresa_nombre = self.default_empresa_nombre

        if self.db and empresa_id:
            try:
                result = await self.db.execute(select(Empresa).where(Empresa.id == empresa_id))
                empresa = result.scalar_one_or_none()
                if empresa:
                    if empresa.smtp_host:
                        smtp_config["host"] = empresa.smtp_host
                    if empresa.smtp_port is not None:
                        smtp_config["port"] = int(empresa.smtp_port)
                    if empresa.smtp_user:
                        smtp_config["user"] = empresa.smtp_user
                        smtp_config["sender"] = empresa.smtp_sender or empresa.smtp_user
                    if empresa.smtp_password:
                        smtp_config["password"] = empresa.smtp_password
                    
                    # Usar la razón social para la plantilla del correo
                    empresa_nombre = empresa.razon_social
            except Exception as e:
                logger.error(f"Error cargando Empresa/SMTP para empresa #{empresa_id}: {e}", exc_info=True)

        return smtp_config, empresa_nombre

    async def _resolve_empresa_logo_path(self, empresa_id: int | None) -> Path | None:
        """
        Obtiene la ruta local (Path) del archivo de logo de la empresa desde la BD.
        Retorna None si no hay logo configurado o el archivo no existe en disco.
        """
        from app.models.core import Empresa

        logo_field = None
        if self.db and empresa_id:
            try:
                result = await self.db.execute(select(Empresa.logo).where(Empresa.id == empresa_id))
                logo_field = result.scalar_one_or_none()
            except Exception as e:
                logger.error(f"Error cargando logo para empresa #{empresa_id}: {e}", exc_info=True)

        if not logo_field:
            return None

        # Limpiar el valor: quitar comillas extras que puedan haberse guardado
        logo_field = logo_field.strip().strip('"').strip("'")

        # Caso 1: Es una ruta absoluta del sistema de archivos (e.g. C:\...\logo.png o /app/uploads/...)
        candidate = Path(logo_field)
        if candidate.is_absolute() and candidate.is_file():
            logger.info(f"Logo encontrado como ruta absoluta: {candidate}")
            return candidate

        # Caso 2: Es una ruta relativa tipo "uploads/logos/logo_ebl.png"
        candidate = BACKEND_ROOT / logo_field
        if candidate.is_file():
            logger.info(f"Logo encontrado como ruta relativa al backend: {candidate}")
            return candidate

        # Caso 3: Solo viene el nombre del archivo, buscamos en uploads/logos/
        candidate = BACKEND_ROOT / "uploads" / "logos" / Path(logo_field).name
        if candidate.is_file():
            logger.info(f"Logo encontrado en uploads/logos/: {candidate}")
            return candidate

        logger.warning(f"Archivo de logo no encontrado para empresa #{empresa_id}: '{logo_field}'")
        return None

    def _send_email_sync(
        self,
        destinatario: str,
        subject: str,
        html_body: str,
        smtp_config: dict,
        logo_path: Path | None = None,
    ) -> bool:
        """Envío síncrono del correo vía SMTP. Se ejecuta en un thread.
        
        Si se proporciona logo_path, la imagen se adjunta como recurso embebido
        con Content-ID 'company_logo', referenciable desde el HTML como src="cid:company_logo".
        """
        import re
        from email.header import Header
        from email.utils import formataddr

        try:
            # Usamos 'related' para permitir adjuntos embebidos CID
            msg = MIMEMultipart("related")
            
            # Formatear y codificar cabecera From para evitar problemas de codificación (ej: acentos como 'í')
            sender_str = smtp_config["sender"]
            match = re.match(r"^(.*?)\s*<(.*?)>$", sender_str)
            if match:
                name, email_addr = match.groups()
                msg["From"] = formataddr((str(Header(name, "utf-8")), email_addr))
            else:
                msg["From"] = sender_str
                
            msg["To"] = destinatario
            msg["Subject"] = Header(subject, "utf-8")

            # Cuerpo HTML como parte alternativa dentro de 'related'
            msg_alternative = MIMEMultipart("alternative")
            msg_alternative.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(msg_alternative)

            # Adjuntar logo como imagen embebida CID si existe
            if logo_path and logo_path.is_file():
                try:
                    mime_type, _ = mimetypes.guess_type(str(logo_path))
                    if mime_type and mime_type.startswith("image/"):
                        subtype = mime_type.split("/")[1]
                    else:
                        subtype = "png"  # fallback

                    with open(logo_path, "rb") as img_file:
                        logo_image = MIMEImage(img_file.read(), _subtype=subtype)
                    
                    logo_image.add_header("Content-ID", "<company_logo>")
                    logo_image.add_header(
                        "Content-Disposition", "inline",
                        filename=logo_path.name
                    )
                    msg.attach(logo_image)
                    logger.info(f"Logo embebido como CID en el correo: {logo_path.name}")
                except Exception as e:
                    logger.warning(f"No se pudo embeber el logo '{logo_path}': {e}")

            with smtplib.SMTP(smtp_config["host"], smtp_config["port"], timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_config["user"], smtp_config["password"])
                server.sendmail(smtp_config["sender"], destinatario, msg.as_string())

            logger.info(f"Correo enviado exitosamente a {destinatario}: {subject} (emisor: {smtp_config['sender']})")
            return True
        except Exception as e:
            logger.error(f"Error enviando correo a {destinatario} usando SMTP {smtp_config.get('host')}: {e}", exc_info=True)
            return False

    async def _send_email(
        self,
        destinatario: str,
        subject: str,
        html_body: str,
        smtp_config: dict,
        logo_path: Path | None = None,
    ) -> bool:
        """Wrapper async que ejecuta el envío en un thread para no bloquear el event loop."""
        if not (smtp_config.get("host") and smtp_config.get("user") and smtp_config.get("password")):
            logger.warning(
                "SMTP no configurado. No se puede enviar correo. "
                "Configure SMTP en la tabla core.empresas o en las variables globales del .env"
            )
            return False
        return await asyncio.to_thread(
            self._send_email_sync, destinatario, subject, html_body, smtp_config, logo_path
        )

    async def enviar_alerta_documentos_pendientes(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str,
        dias_restantes: int,
        fecha_eta: date,
        documentos_pendientes: list[str],
        empresa_id: int | None = None,
        cor: str = ""
    ) -> bool:
        """Envía alerta al cliente sobre documentos pendientes antes del ETA."""
        smtp_config, empresa_nombre = await self._resolve_empresa_smtp(empresa_id)
        logo_path = await self._resolve_empresa_logo_path(empresa_id)

        # Si tenemos logo, la plantilla usará cid:company_logo; si no, usará texto
        logo_url = "cid:company_logo" if logo_path else None

        urgencia_color = "#dc2626" if dias_restantes <= 7 else "#f59e0b" if dias_restantes <= 10 else "#3b82f6"
        urgencia_texto = "URGENTE" if dias_restantes <= 7 else "IMPORTANTE" if dias_restantes <= 10 else "RECORDATORIO"

        html = self._render_template(
            "alerta_documentos_pendientes.html",
            empresa_nombre=empresa_nombre,
            logo_url=logo_url,
            urgencia_color=urgencia_color,
            urgencia_texto=urgencia_texto,
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
            cor=cor,
            fecha_eta=fecha_eta.strftime('%d/%m/%Y'),
            dias_restantes=dias_restantes,
            documentos_pendientes=documentos_pendientes,
        )

        subject = f"[{urgencia_texto}] Documentos pendientes - {cor or titulo_embarque} (ETA: {fecha_eta.strftime('%d/%m/%Y')})"
        return await self._send_email(destinatario_email, subject, html, smtp_config, logo_path)

    async def enviar_confirmacion_documentos_completos(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str,
        empresa_id: int | None = None
    ) -> bool:
        """Envía confirmación al cliente de que todos los documentos han sido recibidos."""
        smtp_config, empresa_nombre = await self._resolve_empresa_smtp(empresa_id)
        logo_path = await self._resolve_empresa_logo_path(empresa_id)
        logo_url = "cid:company_logo" if logo_path else None

        html = self._render_template(
            "confirmacion_documentos_completos.html",
            empresa_nombre=empresa_nombre,
            logo_url=logo_url,
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
        )

        subject = f"Documentos recibidos - {titulo_embarque}"
        return await self._send_email(destinatario_email, subject, html, smtp_config, logo_path)

    async def enviar_alerta_fecha_limite_documentos(
        self,
        destinatario_email: str,
        razon_social: str,
        titulo_embarque: str,
        fecha_limite: date,
        dias_restantes_limite: int,
        fecha_eta: date,
        documentos_pendientes: list[str],
        empresa_id: int | None = None,
        cor: str = ""
    ) -> bool:
        """Envía alerta al cliente sobre la fecha límite para entregar documentos."""
        smtp_config, empresa_nombre = await self._resolve_empresa_smtp(empresa_id)
        logo_path = await self._resolve_empresa_logo_path(empresa_id)
        logo_url = "cid:company_logo" if logo_path else None

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
            empresa_nombre=empresa_nombre,
            logo_url=logo_url,
            urgencia_color=urgencia_color,
            urgencia_texto=urgencia_texto,
            urgencia_icono=urgencia_icono,
            razon_social=razon_social,
            titulo_embarque=titulo_embarque,
            cor=cor,
            fecha_limite=fecha_limite.strftime('%d/%m/%Y'),
            dias_restantes_limite=dias_restantes_limite,
            fecha_eta=fecha_eta.strftime('%d/%m/%Y'),
            documentos_pendientes=documentos_pendientes,
        )

        subject = f"[{urgencia_texto}] Fecha límite de documentos - {cor or titulo_embarque} (Límite: {fecha_limite.strftime('%d/%m/%Y')})"
        return await self._send_email(destinatario_email, subject, html, smtp_config, logo_path)
