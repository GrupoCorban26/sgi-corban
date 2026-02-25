import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_columns():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT COLUMN_NAME, TABLE_SCHEMA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'inbox'
        """))
        rows = result.fetchall()
        print("Columnas en la tabla inbox:")
        for row in rows:
            print(f"- Schema: {row[1]}, Column: {row[0]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_columns())
