import asyncio
import logging
from sqlalchemy import text
from app.database.db_connection import engine
from app.models.base import Base

# Asegurar que los modelos estén importados para que Base.metadata los reconozca
import app.models.whatsapp_supervision

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_evo_db():
    logger.info("Iniciando creación de esquema y tablas para whatsapp_evo...")
    async with engine.begin() as conn:
        # Crear esquema si no existe (Sintaxis SQL Server)
        logger.info("Verificando esquema whatsapp_evo...")
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'whatsapp_evo')
            BEGIN
                EXEC('CREATE SCHEMA whatsapp_evo');
            END
        """))
        
        # Crear todas las tablas que falten
        logger.info("Creando tablas faltantes...")
        await conn.run_sync(Base.metadata.create_all)
        
    logger.info("✅ Esquema y tablas creadas exitosamente.")

if __name__ == "__main__":
    asyncio.run(init_evo_db())
