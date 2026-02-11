import asyncio
import sys
import os
from sqlalchemy import text

# Agregar path
sys.path.append(os.getcwd())

from app.database.db_connection import engine
from app.models.base import Base

# Importar TODOS los modelos
from app.models import (
    administrativo,
    logistica,
    seguridad,
    core,
    comercial,
    comercial_inbox,
    comercial_session
)

async def create_schemas(conn):
    """Crea los schemas necesarios si no existen"""
    schemas = ['adm', 'seg', 'core', 'logistica', 'comercial']
    
    for schema in schemas:
        # Verificar si existe
        check_sql = text(f"SELECT schema_id FROM sys.schemas WHERE name = '{schema}'")
        result = await conn.execute(check_sql)
        if not result.fetchone():
            print(f"⚙️  Creando schema: {schema}")
            # CREATE SCHEMA no se puede ejecutar dentro de una transacción en algunos contextos,
            # pero con SQL Server y SQLAlchemy suele funcionar si se hace commit.
            # Nota: SQL Server requiere que CREATE SCHEMA sea la única sentencia en un batch, 
            # pero vía driver suele pasar.
            try:
                await conn.execute(text(f"CREATE SCHEMA [{schema}]"))
            except Exception as e:
                print(f"⚠️  Advertencia al crear schema {schema}: {e}")

async def init_db():
    print("⏳ Conectando a la base de datos...")
    
    try:
        async with engine.begin() as conn:
            # 1. Crear Schemas primero
            await create_schemas(conn)
            
            # 2. Crear Tablas
            print("⏳ Creando tablas...")
            await conn.run_sync(Base.metadata.create_all)
            
        print("✅ ¡Base de Datos Inicializada con Éxito!")
        print("   - Schemas verificados")
        print("   - Tablas creadas")
        
    except Exception as e:
        print(f"❌ Error fatal: {e}")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(init_db())
    except KeyboardInterrupt:
        print("Cancelado.")
