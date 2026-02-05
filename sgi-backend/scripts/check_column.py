import asyncio
from sqlalchemy import text
from app.database.db_connection import get_db

async def check_columns():
    async for db in get_db():
        # Query sys.columns for SQL Server
        query = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'comercial' 
              AND TABLE_NAME = 'casos_llamada' 
              AND COLUMN_NAME = 'is_positive'
        """)
        result = await db.execute(query)
        exists = result.scalar()
        print(f"Column 'is_positive' exists: {exists}")

if __name__ == "__main__":
    asyncio.run(check_columns())
