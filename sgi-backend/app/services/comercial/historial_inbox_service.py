from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, and_
from datetime import datetime
from app.models.historial_inbox import HistorialInbox
from app.models.comercial_inbox import Inbox

class HistorialInboxService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def registrar_cambio(
        self,
        inbox_id: int,
        estado_nuevo: str,
        estado_anterior: str | None = None,
        motivo_descarte_id: int | None = None,
        comentario: str | None = None,
        created_by: int | None = None
    ) -> HistorialInbox:
        """
        Registra un cambio de estado en el historial del lead y actualiza el estado actual en el inbox.
        """
        # Actualizar el estado en el inbox
        query = select(Inbox).where(Inbox.id == inbox_id)
        result = await self.db.execute(query)
        inbox = result.scalars().first()
        
        if inbox:
            if not estado_anterior:
                estado_anterior = inbox.ultimo_estado
            inbox.ultimo_estado = estado_nuevo
            self.db.add(inbox)

        # Crear el registro de historial
        historial = HistorialInbox(
            inbox_id=inbox_id,
            estado_anterior=estado_anterior,
            estado=estado_nuevo,
            motivo_descarte_id=motivo_descarte_id,
            comentario=comentario,
            created_by=created_by
        )
        self.db.add(historial)
        await self.db.flush()
        
        return historial

    async def obtener_fecha_estado(self, inbox_id: int, estado: str) -> datetime | None:
        """
        Devuelve la fecha en la que el inbox alcanzó por primera vez (o más recientemente) un estado específico.
        """
        query = select(HistorialInbox).where(
            and_(
                HistorialInbox.inbox_id == inbox_id,
                HistorialInbox.estado == estado
            )
        ).order_by(desc(HistorialInbox.created_at))
        result = await self.db.execute(query)
        historial = result.scalars().first()
        if historial:
            return historial.created_at
        return None
