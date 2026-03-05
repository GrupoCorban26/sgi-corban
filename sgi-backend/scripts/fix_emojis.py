import asyncio
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine

async def fix_emojis():
    print("Corrigiendo columnas para soportar Emojis (NVARCHAR)...")
    async with engine.begin() as conn:
        try:
            # chat_messages
            await conn.execute(text("ALTER TABLE comercial.chat_messages ALTER COLUMN contenido NVARCHAR(MAX) NOT NULL"))
            print("OK: comercial.chat_messages.contenido a NVARCHAR(MAX)")
            
            # inbox
            await conn.execute(text("ALTER TABLE comercial.inbox ALTER COLUMN mensaje_inicial NVARCHAR(MAX)"))
            print("OK: comercial.inbox.mensaje_inicial a NVARCHAR(MAX)")
            
            await conn.execute(text("ALTER TABLE comercial.inbox ALTER COLUMN nombre_whatsapp NVARCHAR(100)"))
            print("OK: comercial.inbox.nombre_whatsapp a NVARCHAR(100)")
            
            # Si hay algún otro campo que almacene comentarios con emojis (ej: historial_llamadas)
            # await conn.execute(text("ALTER TABLE comercial.historial_llamadas ALTER COLUMN comentario NVARCHAR(MAX)"))
            print("Corrección finalizada exitosamente.")
        except Exception as e:
            print(f"Error al alterar columnas: {e}")

if __name__ == "__main__":
    asyncio.run(fix_emojis())
