import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE comercial.inbox ADD tipo_interes VARCHAR(30) NULL"))
        print("✅ Column 'tipo_interes' added to comercial.inbox")

asyncio.run(run())
