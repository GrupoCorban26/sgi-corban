import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database.db_connection import AsyncSessionLocal
from app.models.core import Empresa
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Empresa))
        empresas = result.scalars().all()
        print("=== CONTENIDO DE LA TABLA core.empresas ===")
        for emp in empresas:
            print(f"ID: {emp.id} | Razón Social: {emp.razon_social} | Logo en BD: {repr(emp.logo)}")

if __name__ == "__main__":
    asyncio.run(run())
