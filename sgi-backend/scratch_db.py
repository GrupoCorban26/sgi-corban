import asyncio
from sqlalchemy import select, func
from app.database.db_connection import get_db

import main
from app.models import Cliente, ClienteContacto, HistorialLlamada, ClienteGestion, Inbox

async def test():
    async for session in get_db():
        # Get counts
        llamadas_count = await session.execute(select(func.count(HistorialLlamada.id)))
        gestiones_count = await session.execute(select(func.count(ClienteGestion.id)))
        inbox_count = await session.execute(select(func.count(Inbox.id)))
        
        print('Total HistorialLlamada:', llamadas_count.scalar())
        print('Total ClienteGestion:', gestiones_count.scalar())
        print('Total Inbox:', inbox_count.scalar())
        
        # Get latest timestamps
        max_llamada = await session.execute(select(func.max(HistorialLlamada.created_at)))
        max_gestion = await session.execute(select(func.max(ClienteGestion.created_at)))
        max_inbox = await session.execute(select(func.max(Inbox.created_at)))
        
        print('Latest HistorialLlamada created_at:', max_llamada.scalar())
        print('Latest ClienteGestion created_at:', max_gestion.scalar())
        print('Latest Inbox created_at:', max_inbox.scalar())
        break

if __name__ == '__main__':
    asyncio.run(test())
