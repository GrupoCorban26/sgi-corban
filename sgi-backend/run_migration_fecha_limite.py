"""Script para aplicar la migración de fecha_limite_documentos."""
import asyncio
from app.database.db_connection import AsyncSessionLocal
from sqlalchemy import text


async def migrate():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text(
                "ALTER TABLE comercial.seguimientos ADD fecha_limite_documentos DATE NULL"
            ))
            print("✅ Columna fecha_limite_documentos agregada a seguimientos")
        except Exception as e:
            if "already" in str(e).lower() or "ya existe" in str(e).lower() or "duplicate" in str(e).lower():
                print("⏩ fecha_limite_documentos ya existe, saltando...")
            else:
                raise

        try:
            await db.execute(text(
                "ALTER TABLE comercial.seguimiento_alertas_enviadas ADD canal VARCHAR(10) NOT NULL DEFAULT 'EMAIL'"
            ))
            print("✅ Columna canal agregada a seguimiento_alertas_enviadas")
        except Exception as e:
            if "already" in str(e).lower() or "ya existe" in str(e).lower() or "duplicate" in str(e).lower():
                print("⏩ canal ya existe, saltando...")
            else:
                raise

        await db.commit()
        print("✅ Migración completada exitosamente")


if __name__ == "__main__":
    asyncio.run(migrate())
