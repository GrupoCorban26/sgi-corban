import asyncio
import sys
import os

# Agregar path
sys.path.append(os.getcwd())

from app.database.db_connection import engine
from app.models.base import Base

# Importar TODOS los modelos para que Base.metadata los reconozca
# Es necesario importar los módulos donde se definen las clases
from app.models import (
    administrativo,
    logistica,
    seguridad,
    core,
    comercial,
    comercial_inbox,
    comercial_session
)

async def init_db():
    print("⏳ Conectando a la base de datos para crear tablas...")
    try:
        # Como el motor es asíncrono (mssql+aioodbc), usamos run_sync
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Tablas creadas exitosamente en SQL Server.")
    except Exception as e:
        print(f"❌ Error fatal al crear tablas: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(init_db())
    except KeyboardInterrupt:
        print("Cancelado por el usuario.")
