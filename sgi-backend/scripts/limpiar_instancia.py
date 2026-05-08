import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.database.db_connection import engine


async def limpiar():
    async with engine.begin() as conn:
        r = await conn.execute(
            text("DELETE FROM whatsapp_evo.instancias WHERE instance_name = :name"),
            {"name": "sgi_comercial_5"},
        )
        print(f"Instancias eliminadas: {r.rowcount}")


asyncio.run(limpiar())
