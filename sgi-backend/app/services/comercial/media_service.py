"""Servicio para descargar y almacenar archivos multimedia de WhatsApp.

Flujo: media_id → obtener URL temporal de Meta → descargar binario → guardar en uploads/media/
"""
import logging
import os
import uuid
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
GRAPH_API_URL = "https://graph.facebook.com/v21.0"

# Extensiones por tipo MIME
MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/3gpp": ".3gp",
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

# Directorio base para almacenar archivos
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "media")


class MediaService:
    """Servicio para descargar medios de la API de WhatsApp Cloud."""

    @staticmethod
    async def descargar_media(media_id: str) -> dict | None:
        """Descarga un archivo multimedia de WhatsApp y lo guarda localmente.
        
        Args:
            media_id: ID del media proporcionado por WhatsApp.
            
        Returns:
            dict con 'ruta_relativa', 'mime_type', 'nombre_archivo' o None si falla.
        """
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Obtener la URL temporal del media
                response = await client.get(
                    f"{GRAPH_API_URL}/{media_id}",
                    headers=headers
                )
                response.raise_for_status()
                media_info = response.json()

                media_url = media_info.get("url")
                mime_type = media_info.get("mime_type", "application/octet-stream")

                if not media_url:
                    logger.error(f"[MEDIA] No se obtuvo URL para media_id={media_id}")
                    return None

                # 2. Descargar el archivo binario
                download_response = await client.get(
                    media_url,
                    headers=headers
                )
                download_response.raise_for_status()

                # 3. Determinar extensión y generar nombre único
                extension = MIME_EXTENSIONS.get(mime_type, ".bin")
                fecha = datetime.now().strftime("%Y%m%d")
                nombre_archivo = f"{fecha}_{uuid.uuid4().hex[:8]}{extension}"

                # Crear subdirectorio por fecha
                subdir = os.path.join(UPLOAD_DIR, fecha)
                os.makedirs(subdir, exist_ok=True)

                # 4. Guardar archivo
                ruta_completa = os.path.join(subdir, nombre_archivo)
                with open(ruta_completa, "wb") as f:
                    f.write(download_response.content)

                # Ruta relativa desde la raíz del proyecto (para servir vía FastAPI)
                ruta_relativa = f"/uploads/media/{fecha}/{nombre_archivo}"

                logger.info(
                    f"[MEDIA] Archivo descargado: {nombre_archivo} "
                    f"({mime_type}, {len(download_response.content)} bytes)"
                )

                return {
                    "ruta_relativa": ruta_relativa,
                    "mime_type": mime_type,
                    "nombre_archivo": nombre_archivo,
                }

        except httpx.HTTPStatusError as e:
            logger.error(
                f"[MEDIA] Error HTTP descargando media_id={media_id}: "
                f"{e.response.status_code} - {e.response.text}"
            )
            return None
        except Exception as e:
            logger.error(f"[MEDIA] Error descargando media_id={media_id}: {e}", exc_info=True)
            return None
