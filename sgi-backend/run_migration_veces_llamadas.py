import asyncio
import logging
from sqlalchemy import text
from app.database.db_connection import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

async def run_migration():
    logger.info("Iniciando migración para agregar veces_llamadas y fecha_asignacion...")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Agregar veces_llamadas
            logger.info("Agregando columna veces_llamadas a comercial.bases...")
            await session.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('comercial.bases') AND name = 'veces_llamadas'
                )
                BEGIN
                    ALTER TABLE comercial.bases ADD veces_llamadas INT NOT NULL DEFAULT 0;
                END
            """))
            
            # 2. Agregar fecha_asignacion
            logger.info("Agregando columna fecha_asignacion a comercial.bases...")
            await session.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('comercial.bases') AND name = 'fecha_asignacion'
                )
                BEGIN
                    ALTER TABLE comercial.bases ADD fecha_asignacion DATETIME NULL;
                END
            """))
            
            await session.commit()
            logger.info("¡Migración completada exitosamente!")
        except Exception as e:
            await session.rollback()
            logger.error(f"Error durante la migración: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_migration())
