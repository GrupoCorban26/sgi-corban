import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine
from sqlalchemy import text

async def run():
    print("=== EJECUTANDO MIGRACIÓN: AGREGAR COLUMNA 'logo' A 'core.empresas' ===")
    async with engine.begin() as conn:
        # Verificar si la columna ya existe
        check_query = """
        SELECT COUNT(*) 
        FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'core.empresas') AND name = N'logo'
        """
        result = await conn.execute(text(check_query))
        exists = result.scalar()
        
        if exists == 0:
            await conn.execute(text("ALTER TABLE core.empresas ADD logo VARCHAR(500) NULL"))
            print("✅ Columna 'logo' agregada con éxito a core.empresas")
        else:
            print("ℹ️ La columna 'logo' ya existe en core.empresas")

if __name__ == "__main__":
    asyncio.run(run())
