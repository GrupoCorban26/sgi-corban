import asyncio
import logging
from sqlalchemy import text
from app.database.db_connection import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_gestiones")

async def run_migration():
    logger.info("Iniciando migración para optimizar índices de comercial.cliente_gestiones...")
    async with AsyncSessionLocal() as session:
        try:
            logger.info("Creando índice compuesto IX_cliente_gestiones_cliente_id_created_at...")
            await session.execute(text("""
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_gestiones_cliente_id_created_at' AND object_id = OBJECT_ID('comercial.cliente_gestiones'))
                BEGIN
                    CREATE INDEX IX_cliente_gestiones_cliente_id_created_at 
                    ON comercial.cliente_gestiones (cliente_id, created_at DESC);
                END
            """))
            
            await session.commit()
            logger.info("¡Migración de índices completada exitosamente!")
        except Exception as e:
            await session.rollback()
            logger.error(f"Error durante la migración: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_migration())
