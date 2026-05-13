import asyncio
from app.database.db_connection import async_session
from sqlalchemy import select
from app.models.comercial_inbox import Inbox
from app.models.comercial_catalogos import MotivoDescarteInbox

async def main():
    async with async_session() as db:
        stmt = (
            select(
                Inbox.estado,
                Inbox.motivo_descarte_id,
                Inbox.comentario_descarte,
                MotivoDescarteInbox.nombre.label("motivo_nombre")
            )
            .outerjoin(MotivoDescarteInbox, Inbox.motivo_descarte_id == MotivoDescarteInbox.id)
            .where(Inbox.estado == 'DESCARTADO')
            .limit(10)
        )
        res = await db.execute(stmt)
        for row in res.all():
            print(f"Estado: {row.estado}, MotivoID: {row.motivo_descarte_id}, Motivo: {row.motivo_nombre}, Comentario: {row.comentario_descarte}")

if __name__ == "__main__":
    asyncio.run(main())
