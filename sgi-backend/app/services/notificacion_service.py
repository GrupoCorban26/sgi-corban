"""
Servicio de notificaciones.
Crea, consulta y gestiona notificaciones para los usuarios del sistema.
"""
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, update
from app.models.notificacion import Notificacion

logger = logging.getLogger(__name__)


class NotificacionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear_notificacion(
        self,
        usuario_id: int,
        tipo: str,
        titulo: str,
        mensaje: str = None,
        url_destino: str = None,
        datos_extra: dict = None
    ) -> Notificacion:
        """Crea una nueva notificación para un usuario."""
        notificacion = Notificacion(
            usuario_id=usuario_id,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            url_destino=url_destino,
            datos_extra=json.dumps(datos_extra) if datos_extra else None
        )
        self.db.add(notificacion)
        await self.db.flush()  # Para obtener el ID sin hacer commit aún
        logger.info(f"[NOTIFICACION] Creada para usuario {usuario_id}: {titulo}")
        return notificacion

    async def obtener_notificaciones(
        self, usuario_id: int, solo_no_leidas: bool = False, limite: int = 20
    ) -> list:
        """Obtiene las notificaciones de un usuario, ordenadas por fecha descendente."""
        condiciones = [Notificacion.usuario_id == usuario_id]
        if solo_no_leidas:
            condiciones.append(Notificacion.leida == False)

        query = (
            select(Notificacion)
            .where(and_(*condiciones))
            .order_by(Notificacion.created_at.desc())
            .limit(limite)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def contar_no_leidas(self, usuario_id: int) -> int:
        """Cuenta las notificaciones no leídas de un usuario."""
        query = select(func.count()).select_from(Notificacion).where(
            and_(Notificacion.usuario_id == usuario_id, Notificacion.leida == False)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def marcar_como_leida(self, notificacion_id: int, usuario_id: int) -> bool:
        """Marca una notificación específica como leída."""
        notificacion = await self.db.get(Notificacion, notificacion_id)
        if notificacion and notificacion.usuario_id == usuario_id:
            notificacion.leida = True
            await self.db.commit()
            return True
        return False

    async def marcar_todas_leidas(self, usuario_id: int) -> int:
        """Marca todas las notificaciones del usuario como leídas. Retorna la cantidad actualizada."""
        stmt = (
            update(Notificacion)
            .where(and_(Notificacion.usuario_id == usuario_id, Notificacion.leida == False))
            .values(leida=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    async def notificar_lead_asignado(
        self, comercial_id: int, nombre_lead: str, telefono: str, inbox_id: int
    ):
        """Crea una notificación de lead asignado para un comercial."""
        await self.crear_notificacion(
            usuario_id=comercial_id,
            tipo="LEAD_ASIGNADO",
            titulo="🔔 Nuevo lead asignado",
            mensaje=f"Se te ha asignado un nuevo lead: {nombre_lead} ({telefono})",
            url_destino=f"/comercial/buzon",
            datos_extra={"inbox_id": inbox_id, "telefono": telefono, "nombre": nombre_lead}
        )
        await self.db.commit()
