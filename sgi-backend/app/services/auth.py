import logging
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.seguridad import Usuario, Rol, Sesion
from app.models.administrativo import Empleado, Area, Cargo

logger = logging.getLogger(__name__)


class AuthService:
    """Servicio de autenticación y gestión de sesiones."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # AUTENTICACIÓN
    # =========================================================================

    async def obtener_usuario_por_correo(self, correo: str):
        """
        Obtiene un usuario por su correo corporativo usando ORM de SQLAlchemy.
        Carga ansiosamente (eager load) relaciones necesarias: Empleado, Area, Cargo, Roles, Permisos.
        """
        try:
            query = (
                select(Usuario)
                .where(Usuario.correo_corp == correo)
                .options(
                    selectinload(Usuario.empleado)
                    .selectinload(Empleado.cargo)
                    .selectinload(Cargo.area)
                    .selectinload(Area.departamento),
                    selectinload(Usuario.roles)
                    .selectinload(Rol.permisos)
                )
            )

            result = await self.db.execute(query)
            usuario = result.scalars().first()

            if not usuario:
                return None

            # Extraer roles
            roles = [r.nombre for r in usuario.roles] if usuario.roles else []

            # Extraer permisos de todos los roles (aplanar y deduplicar)
            permisos = list({
                permiso.nombre_tecnico
                for rol in (usuario.roles or [])
                for permiso in (rol.permisos or [])
            })

            # Datos del empleado
            nombre_corto = "Usuario Sistema"
            area_nombre = "Sin Área"
            cargo_nombre = "Sin Cargo"

            if usuario.empleado:
                nombre_corto = f"{usuario.empleado.nombres} {usuario.empleado.apellido_paterno}"
                if usuario.empleado.area:
                    area_nombre = usuario.empleado.area.nombre
                if usuario.empleado.cargo:
                    cargo_nombre = usuario.empleado.cargo.nombre

            return {
                "usuario_id": usuario.id,
                "correo": usuario.correo_corp,
                "password_hash": usuario.password_hash,
                "is_bloqueado": usuario.is_bloqueado,
                "nombre_corto": nombre_corto,
                "permisos": permisos,
                "roles": roles,
                "area_nombre": area_nombre,
                "cargo_nombre": cargo_nombre,
                "debe_cambiar_pass": usuario.debe_cambiar_pass
            }

        except Exception as e:
            logger.error(f"Error en obtener_usuario_por_correo: {e}")
            return None

    # =========================================================================
    # GESTIÓN DE SESIONES
    # =========================================================================

    @staticmethod
    def _hash_token(token: str) -> str:
        """Genera un hash SHA256 del token para almacenamiento seguro."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def registrar_sesion(
        self, usuario_id: int, token: str, ip: str = None, user_agent: str = None
    ):
        """Registra una nueva sesión activa en la base de datos."""
        try:
            expira = datetime.now(timezone.utc) + timedelta(minutes=30)
            token_hash = self._hash_token(token)

            nueva_sesion = Sesion(
                usuario_id=usuario_id,
                refresh_token=token_hash,
                ip_address=ip,
                user_agent=user_agent,
                expira_en=expira,
                es_revocado=False
            )
            self.db.add(nueva_sesion)
            await self.db.commit()
        except Exception as e:
            logger.error(f"Error registrando sesión: {e}")

    async def revocar_sesion(self, token: str) -> bool:
        """Revoca (marca como inválida) una sesión basada en el token."""
        try:
            token_hash = self._hash_token(token)
            query = select(Sesion).where(Sesion.refresh_token == token_hash)
            result = await self.db.execute(query)
            sesion = result.scalars().first()

            if sesion:
                sesion.es_revocado = True
                await self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error revocando sesión: {e}")
            return False

    async def verificar_sesion_activa(self, token: str) -> bool:
        """Verifica si existe una sesión activa y no revocada para este token."""
        try:
            token_hash = self._hash_token(token)
            query = select(Sesion).where(Sesion.refresh_token == token_hash)
            result = await self.db.execute(query)
            sesion = result.scalars().first()

            if not sesion:
                return False

            if sesion.es_revocado:
                return False

            if sesion.expira_en.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                return False

            return True
        except Exception as e:
            logger.error(f"Error verificando sesión: {e}")
            return False

    async def extender_sesion(self, token: str):
        """
        Extiende la vida de la sesión si está próxima a vencer (Sliding Expiration).
        Se llama en cada request autenticado.
        """
        try:
            token_hash = self._hash_token(token)
            query = select(Sesion).where(Sesion.refresh_token == token_hash)
            result = await self.db.execute(query)
            sesion = result.scalars().first()

            if not sesion or sesion.es_revocado:
                return

            now = datetime.now(timezone.utc)
            tiempo_restante = sesion.expira_en.replace(tzinfo=timezone.utc) - now

            # Solo extender si le queda menos de 25 min (evita write en cada request)
            if tiempo_restante.total_seconds() < (25 * 60):
                sesion.expira_en = now + timedelta(minutes=30)
                await self.db.commit()

        except Exception as e:
            logger.error(f"Error extendiendo sesión: {e}")


# =============================================================================
# Funciones de compatibilidad (mantiene imports existentes funcionando)
# =============================================================================

async def obtener_usuario_por_correo(db: AsyncSession, correo: str):
    """Wrapper de compatibilidad."""
    return await AuthService(db).obtener_usuario_por_correo(correo)


async def registrar_sesion(db: AsyncSession, usuario_id: int, token: str, ip: str = None, user_agent: str = None):
    """Wrapper de compatibilidad."""
    await AuthService(db).registrar_sesion(usuario_id, token, ip, user_agent)


async def revocar_sesion(db: AsyncSession, token: str):
    """Wrapper de compatibilidad."""
    return await AuthService(db).revocar_sesion(token)


async def verificar_sesion_activa(db: AsyncSession, token: str) -> bool:
    """Wrapper de compatibilidad."""
    return await AuthService(db).verificar_sesion_activa(token)


async def extender_sesion(db: AsyncSession, token: str):
    """Wrapper de compatibilidad."""
    await AuthService(db).extender_sesion(token)
