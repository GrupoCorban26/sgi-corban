import asyncio
import sys
import os

# Add the parent directory to sys.path to allow importing app
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database.db_connection import AsyncSessionLocal

async def run_migration():
    print("Starting migration...")
    async with AsyncSessionLocal() as session:
        try:
            # SQL statements without USE and GO
            sqls = [
                "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'motivo_perdida') ALTER TABLE comercial.clientes ADD motivo_perdida VARCHAR(50) NULL;",
                "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'fecha_perdida') ALTER TABLE comercial.clientes ADD fecha_perdida DATE NULL;",
                "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'fecha_reactivacion') ALTER TABLE comercial.clientes ADD fecha_reactivacion DATE NULL;"
            ]
            
            for statement in sqls:
                print(f"Executing: {statement}")
                await session.execute(text(statement))
            
            await session.commit()
            print("Migration executed successfully.")
        except Exception as e:
            print(f"Error executing migration: {e}")
            await session.rollback()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
