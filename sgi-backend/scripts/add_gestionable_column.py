import asyncio
from sqlalchemy import text
from app.database.db_connection import get_db

async def add_column():
    print("Agregando columna 'gestionable' a comercial.casos_llamada...")
    async for db in get_db():
        try:
            # Check if column exists
            check_query = text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'comercial' 
                  AND TABLE_NAME = 'casos_llamada' 
                  AND COLUMN_NAME = 'gestionable'
            """)
            result = await db.execute(check_query)
            if result.scalar():
                print("La columna 'gestionable' ya existe.")
            else:
                # Add column
                alter_query = text("ALTER TABLE comercial.casos_llamada ADD gestionable BIT DEFAULT 0 NOT NULL")
                await db.execute(alter_query)
                await db.commit()
                print("Columna 'gestionable' agregada correctamente.")
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(add_column())
