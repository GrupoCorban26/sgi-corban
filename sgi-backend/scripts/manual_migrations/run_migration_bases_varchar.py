import asyncio
import logging
from sqlalchemy import text
from app.database.db_connection import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_varchar")

async def run_migration():
    logger.info("Iniciando migración para unificar RUC y teléfono como VARCHAR...")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Dropear índices dependientes si existen
            logger.info("Droppeando índices antiguos de comercial.bases...")
            await session.execute(text("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bases_ruc' AND object_id = OBJECT_ID('comercial.bases'))
                BEGIN
                    DROP INDEX IX_bases_ruc ON comercial.bases;
                END
            """))
            await session.execute(text("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bases_telefono' AND object_id = OBJECT_ID('comercial.bases'))
                BEGIN
                    DROP INDEX IX_bases_telefono ON comercial.bases;
                END
            """))
            
            # 2. Alterar las columnas a VARCHAR
            logger.info("Alterando columnas a VARCHAR...")
            await session.execute(text("""
                ALTER TABLE comercial.bases ALTER COLUMN ruc VARCHAR(11) NOT NULL;
                ALTER TABLE comercial.bases ALTER COLUMN telefono VARCHAR(20) NOT NULL;
            """))
            
            # 3. Recrear índices
            logger.info("Recreando índices con VARCHAR...")
            await session.execute(text("""
                CREATE INDEX IX_bases_ruc ON comercial.bases (ruc);
                CREATE INDEX IX_bases_telefono ON comercial.bases (telefono);
            """))
            
            await session.commit()
            logger.info("¡Migración completada exitosamente!")
        except Exception as e:
            await session.rollback()
            logger.error(f"Error durante la migración: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_migration())
