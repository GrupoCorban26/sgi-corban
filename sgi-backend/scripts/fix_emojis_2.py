import asyncio
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine

async def fix_emojis():
    print("Corrigiendo INBOX...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE comercial.inbox ALTER COLUMN mensaje_inicial NVARCHAR(MAX)"))
            print("OK: comercial.inbox.mensaje_inicial a NVARCHAR(MAX)")
            await conn.execute(text("ALTER TABLE comercial.inbox ALTER COLUMN nombre_whatsapp NVARCHAR(100)"))
            print("OK: comercial.inbox.nombre_whatsapp a NVARCHAR(100)")
            await conn.execute(text("ALTER TABLE comercial.inbox ALTER COLUMN comentario_descarte NVARCHAR(MAX)"))
            print("OK: comercial.inbox.comentario_descarte a NVARCHAR(MAX)")
        except Exception as e:
            print(f"Error INBOX: {e}")

if __name__ == "__main__":
    asyncio.run(fix_emojis())
