import asyncio
from sqlalchemy import text
from app.database.db_connection import get_db

async def check_casos():
    async for db in get_db():
        result = await db.execute(text("SELECT id, nombre, contestado FROM comercial.casos_llamada"))
        rows = result.fetchall()
        print(f"Total rows: {len(rows)}")
        for row in rows:
            print(f"ID: {row.id}, Nombre: {row.nombre}, Contestado: {row.contestado}, Type: {type(row.contestado)}")

if __name__ == "__main__":
    asyncio.run(check_casos())
