"""
Servicio de Configuraciones del Sistema.
Maneja CRUD con encriptación de valores sensibles y auditoría automática.
"""
import json
import logging
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.core import Configuracion, ConfiguracionHistorial
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.core.configuracion import ConfiguracionCreate, ConfiguracionUpdate
from app.utils.encryption import encrypt_value, decrypt_value, mask_value
from app.core.settings import get_settings

logger = logging.getLogger(__name__)


class ConfiguracionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._secret = get_settings().SECRET_KEY

    # =========================================================================
    # LECTURA
    # =========================================================================

    async def listar(self, categoria: Optional[str] = None) -> List[dict]:
        """Lista todas las configuraciones. Valores sensibles se muestran enmascarados."""
        stmt = select(Configuracion).order_by(Configuracion.categoria, Configuracion.clave)
        if categoria:
            stmt = stmt.where(Configuracion.categoria == categoria)

        result = await self.db.execute(stmt)
        configs = result.scalars().all()

        return [self._to_response(c) for c in configs]

    async def obtener_por_clave(self, clave: str) -> dict:
        """Obtiene una configuración por su clave."""
        config = await self._get_by_clave(clave)
        if not config:
            raise HTTPException(404, f"Configuración '{clave}' no encontrada")
        return self._to_response(config)

    async def obtener_valor(self, clave: str) -> Optional[str]:
        """
        Obtiene el valor desencriptado de una configuración.
        Uso interno del backend (ej: obtener API key para enviar mensajes).
        """
        config = await self._get_by_clave(clave)
        if not config or not config.valor:
            return None

        if config.is_sensible:
            return decrypt_value(config.valor, self._secret)
        return config.valor

    async def obtener_publicas(self, categoria: Optional[str] = None) -> List[dict]:
        """
        Obtiene configuraciones NO sensibles para el frontend (colores, logos, nombres).
        No requiere autenticación.
        """
        stmt = select(Configuracion).where(
            Configuracion.is_sensible == False
        ).order_by(Configuracion.categoria, Configuracion.clave)

        if categoria:
            stmt = stmt.where(Configuracion.categoria == categoria)

        result = await self.db.execute(stmt)
        configs = result.scalars().all()

        return [
            {"clave": c.clave, "valor": c.valor, "tipo_dato": c.tipo_dato, "categoria": c.categoria}
            for c in configs
        ]

    async def obtener_por_categoria_dict(self, categoria: str) -> dict:
        """
        Retorna las configuraciones de una categoría como diccionario {clave: valor}.
        Útil para el frontend: GET /configuraciones/publicas/APARIENCIA → {"color_primario": "#1a1a2e", ...}
        """
        configs = await self.obtener_publicas(categoria)
        return {c["clave"]: c["valor"] for c in configs}

    # =========================================================================
    # ESCRITURA
    # =========================================================================

    async def crear(self, data: ConfiguracionCreate, user_id: int) -> dict:
        """Crea una nueva configuración."""
        # Verificar que no exista
        existente = await self._get_by_clave(data.clave)
        if existente:
            raise HTTPException(400, f"Ya existe una configuración con la clave '{data.clave}'")

        valor_guardar = data.valor
        if data.is_sensible and data.valor:
            valor_guardar = encrypt_value(data.valor, self._secret)

        config = Configuracion(
            clave=data.clave,
            valor=valor_guardar,
            tipo_dato=data.tipo_dato,
            categoria=data.categoria,
            descripcion=data.descripcion,
            is_sensible=data.is_sensible,
        )
        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)

        logger.info(f"Configuración '{data.clave}' creada por usuario {user_id}")
        return self._to_response(config)

    async def actualizar(self, clave: str, data: ConfiguracionUpdate, user_id: int) -> dict:
        """Actualiza el valor de una configuración con auditoría automática."""
        config = await self._get_by_clave(clave)
        if not config:
            raise HTTPException(404, f"Configuración '{clave}' no encontrada")

        # Guardar valor anterior para historial
        valor_anterior_display = self._get_display_value(config)

        # Actualizar valor
        if data.valor is not None:
            if config.is_sensible:
                config.valor = encrypt_value(data.valor, self._secret)
            else:
                config.valor = data.valor

        if data.descripcion is not None:
            config.descripcion = data.descripcion

        config.updated_at = func.now()

        # Registrar en historial
        valor_nuevo_display = mask_value(data.valor) if config.is_sensible else data.valor

        historial = ConfiguracionHistorial(
            configuracion_id=config.id,
            valor_anterior=valor_anterior_display,
            valor_nuevo=valor_nuevo_display,
            motivo_cambio=data.motivo_cambio,
            modificado_por=user_id,
        )
        self.db.add(historial)
        await self.db.commit()
        await self.db.refresh(config)

        logger.info(f"Configuración '{clave}' actualizada por usuario {user_id}")
        return self._to_response(config)

    async def eliminar(self, clave: str, user_id: int) -> dict:
        """Elimina una configuración."""
        config = await self._get_by_clave(clave)
        if not config:
            raise HTTPException(404, f"Configuración '{clave}' no encontrada")

        # Registrar eliminación en historial
        historial = ConfiguracionHistorial(
            configuracion_id=config.id,
            valor_anterior=self._get_display_value(config),
            valor_nuevo=None,
            motivo_cambio="ELIMINADA",
            modificado_por=user_id,
        )
        self.db.add(historial)
        await self.db.delete(config)
        await self.db.commit()

        logger.info(f"Configuración '{clave}' eliminada por usuario {user_id}")
        return {"success": True, "message": f"Configuración '{clave}' eliminada"}

    # =========================================================================
    # HISTORIAL
    # =========================================================================

    async def obtener_historial(self, clave: Optional[str] = None) -> List[dict]:
        """Obtiene el historial de cambios, opcionalmente filtrado por clave."""
        stmt = select(
            ConfiguracionHistorial,
            Configuracion.clave,
            Empleado.nombres,
            Empleado.apellido_paterno
        ).join(
            Configuracion, ConfiguracionHistorial.configuracion_id == Configuracion.id
        ).outerjoin(
            Usuario, ConfiguracionHistorial.modificado_por == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).order_by(ConfiguracionHistorial.fecha_cambio.desc())

        if clave:
            stmt = stmt.where(Configuracion.clave == clave)

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": h.id,
                "configuracion_id": h.configuracion_id,
                "clave": conf_clave,
                "valor_anterior": h.valor_anterior,
                "valor_nuevo": h.valor_nuevo,
                "motivo_cambio": h.motivo_cambio,
                "modificado_por": h.modificado_por,
                "modificado_por_nombre": f"{nombres} {apellido}" if nombres else None,
                "fecha_cambio": h.fecha_cambio,
            }
            for h, conf_clave, nombres, apellido in rows
        ]

    # =========================================================================
    # UPLOAD DE IMAGEN (logos, etc.)
    # =========================================================================

    async def subir_imagen(self, clave: str, file, user_id: int) -> dict:
        """
        Sube una imagen y la asocia a una configuración.
        Guarda el archivo en /uploads/configuraciones/ y el path en el valor.
        """
        import os
        from datetime import datetime

        config = await self._get_by_clave(clave)
        if not config:
            raise HTTPException(404, f"Configuración '{clave}' no encontrada")

        if config.tipo_dato != "IMAGE":
            raise HTTPException(400, f"La configuración '{clave}' no es de tipo IMAGE")

        # Validar extensión
        extension = file.filename.split(".")[-1].lower()
        if extension not in ("png", "jpg", "jpeg", "svg", "webp", "ico"):
            raise HTTPException(400, "Formato de imagen no soportado. Use: png, jpg, svg, webp, ico")

        # Guardar archivo
        upload_dir = os.path.join("uploads", "configuraciones")
        os.makedirs(upload_dir, exist_ok=True)

        filename = f"{clave}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{extension}"
        filepath = os.path.join(upload_dir, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        # Guardar path anterior para historial
        valor_anterior = config.valor

        # Actualizar configuración con la ruta del archivo
        ruta_publica = f"/uploads/configuraciones/{filename}"
        config.valor = ruta_publica
        config.updated_at = func.now()

        # Historial
        historial = ConfiguracionHistorial(
            configuracion_id=config.id,
            valor_anterior=valor_anterior,
            valor_nuevo=ruta_publica,
            motivo_cambio="Imagen actualizada",
            modificado_por=user_id,
        )
        self.db.add(historial)
        await self.db.commit()
        await self.db.refresh(config)

        # Eliminar imagen anterior si existía
        if valor_anterior and valor_anterior.startswith("/uploads/"):
            old_path = valor_anterior.lstrip("/")
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass

        logger.info(f"Imagen subida para '{clave}' por usuario {user_id}: {ruta_publica}")
        return self._to_response(config)

    # =========================================================================
    # HELPERS
    # =========================================================================

    async def _get_by_clave(self, clave: str) -> Optional[Configuracion]:
        """Busca configuración por clave."""
        result = await self.db.execute(
            select(Configuracion).where(Configuracion.clave == clave)
        )
        return result.scalars().first()

    def _to_response(self, config: Configuracion) -> dict:
        """Convierte un modelo a dict de respuesta, enmascarando valores sensibles."""
        valor_display = config.valor
        if config.is_sensible and config.valor:
            valor_display = mask_value(decrypt_value(config.valor, self._secret))

        return {
            "id": config.id,
            "clave": config.clave,
            "valor": valor_display,
            "tipo_dato": config.tipo_dato,
            "categoria": config.categoria,
            "descripcion": config.descripcion,
            "is_sensible": config.is_sensible,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        }

    def _get_display_value(self, config: Configuracion) -> Optional[str]:
        """Obtiene el valor legible (enmascarado si sensible) para historial."""
        if not config.valor:
            return None
        if config.is_sensible:
            return mask_value(decrypt_value(config.valor, self._secret))
        return config.valor
