import asyncio
from sqlalchemy import text
from app.database.db_connection import engine

async def alter():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE whatsapp_evo.mensajes ADD participant VARCHAR(100) NULL"))
            print("Added participant")
        except Exception as e:
            print("Err participant:", e)
        try:
            await conn.execute(text("ALTER TABLE whatsapp_evo.mensajes ADD participant_name NVARCHAR(200) NULL"))
            print("Added participant_name")
        except Exception as e:
            print("Err participant_name:", e)
        try:
            await conn.execute(text("ALTER TABLE whatsapp_evo.mensajes ADD reaccion NVARCHAR(50) NULL"))
            print("Added reaccion")
        except Exception as e:
            print("Err reaccion:", e)

if __name__ == "__main__":
    asyncio.run(alter())
