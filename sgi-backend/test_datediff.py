import asyncio
from sqlalchemy import select, func, text, literal_column
from app.database.db_connection import get_db
from app.models.comercial_inbox import Inbox

async def test():
    async for session in get_db():
        stmt = select(func.avg(func.datediff(text('second'), Inbox.fecha_recepcion, Inbox.fecha_gestion))).select_from(Inbox).where(Inbox.fecha_gestion != None)
        result = await session.execute(stmt)
        print("Result:", result.scalar())
        break

asyncio.run(test())
