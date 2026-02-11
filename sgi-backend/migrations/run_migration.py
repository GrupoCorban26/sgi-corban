import asyncio
from sqlalchemy import text
from app.database.service import get_db_session

async def run_migration():
    async for session in get_db_session():
        try:
            with open("migrations/pipeline_ventas.sql", "r") as f:
                sql = f.read()
                # Split by GO if necessary, but SQL Server over SQLAlchemy might not support GO.
                # Actually, running raw SQL with GO might fail if executed as a single block.
                # However, the SQL file has GO statements which are batch separators.
                # I'll just execute simpler statements one by one or remove GO.
                statements = sql.split("GO")
                for statement in statements:
                    if statement.strip():
                        await session.execute(text(statement))
            await session.commit()
            print("Migration executed successfully.")
        except Exception as e:
            print(f"Error executing migration: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(run_migration())
