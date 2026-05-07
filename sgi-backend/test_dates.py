import asyncio
from sqlalchemy import select, func
from app.database.db_connection import get_db
from app.models.historial_llamadas import HistorialLlamada

async def test():
    async for session in get_db():
        result = await session.execute(select(func.max(HistorialLlamada.created_at)))
        print('Latest HistorialLlamada created_at:', result.scalar())
        
        result2 = await session.execute(select(func.min(HistorialLlamada.created_at)))
        print('Oldest HistorialLlamada created_at:', result2.scalar())
        break

asyncio.run(test())
