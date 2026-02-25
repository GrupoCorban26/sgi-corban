import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from sqlalchemy import text
from app.database.db_connection import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        # Activos con serie
        r = await db.execute(text("SELECT TOP 10 id, producto, marca, serie FROM adm.activos"))
        rows = r.fetchall()
        print("=== Primeros 10 activos ===")
        for row in rows:
            print(f"  id={row[0]}, producto={row[1]}, marca={row[2]}, serie=[{row[3]}]")

        # Contar cuantos tienen serie
        r2 = await db.execute(text("SELECT COUNT(*) FROM adm.activos WHERE serie IS NOT NULL AND serie != ''"))
        total_con = r2.scalar()
        r3 = await db.execute(text("SELECT COUNT(*) FROM adm.activos"))
        total = r3.scalar()
        print(f"\nTotal activos: {total}")
        print(f"Con serie/IMEI: {total_con}")
        print(f"Sin serie/IMEI: {total - total_con}")

asyncio.run(check())
