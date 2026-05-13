import asyncio
from sqlalchemy import select
from app.db.session import async_session
from app.models.comercial import CasoLlamada

async def main():
    async with async_session() as db:
        result = await db.execute(select(CasoLlamada.id, CasoLlamada.nombre, CasoLlamada.contestado))
        for r in result.all():
            print(r)

asyncio.run(main())
