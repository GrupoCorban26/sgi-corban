import asyncio
import sys
from sqlalchemy import text
from app.database.db_connection import engine

async def run_sql():
    with open("scripts/create_historial_llamadas.sql", "r") as f:
        sql_commands = f.read().split("GO")
    
    async with engine.begin() as conn:
        for cmd in sql_commands:
            cmd = cmd.strip()
            if cmd:
                await conn.execute(text(cmd))
    print("Migración exitosa")

if __name__ == "__main__":
    asyncio.run(run_sql())
