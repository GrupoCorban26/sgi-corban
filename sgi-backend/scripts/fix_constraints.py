import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Adjust path to include the project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Try to import settings. If it fails, we might need to load env vars manually or ask user.
from dotenv import load_dotenv
load_dotenv()

try:
    from app.database.db_connection import DB_URL
except ImportError:
    # If import fails (e.g. strict path), fall back to manual construction
    import urllib.parse
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_SERVER = os.getenv("DB_SERVER")
    DB_NAME = os.getenv("DB_NAME")
    DB_DRIVER = os.getenv("DB_DRIVER")
    
    password_encoded = urllib.parse.quote_plus(DB_PASS) if DB_PASS else ""
    DB_URL = (
        f"mssql+aioodbc://{DB_USER}:{password_encoded}@{DB_SERVER}/{DB_NAME}?"
        f"driver={DB_DRIVER}&TrustServerCertificate=yes"
    )

async def fix_constraints():
    print(f"Connecting to database...")
    # Use the async engine
    engine = create_async_engine(DB_URL, echo=True)
    
    async with engine.begin() as conn:
        print("1. Dropping old constraint CK_clientes_estado...")
        try:
            await conn.execute(text("ALTER TABLE comercial.clientes DROP CONSTRAINT CK_clientes_estado"))
            print("   -> Dropped successfully.")
        except Exception as e:
            print(f"   -> Warning: Could not drop constraint (it might not exist). Details: {e}")

        print("2. Adding new constraint with 'EN_NEGOCIACION' and 'PERDIDO'...")
        # Allowed: PROSPECTO, CONTACTADO, INTERESADO, EN_NEGOCIACION, CLIENTE, PERDIDO, INACTIVO
        sql = """
        ALTER TABLE comercial.clientes ADD CONSTRAINT CK_clientes_estado 
        CHECK (tipo_estado IN ('PROSPECTO', 'CONTACTADO', 'INTERESADO', 'EN_NEGOCIACION', 'CLIENTE', 'PERDIDO', 'INACTIVO'))
        """
        await conn.execute(text(sql))
        print("   -> New constraint added successfully.")

    await engine.dispose()
    print("Done.")

if __name__ == "__main__":
    # Windows SelectorEventLoopPolicy fix if needed, but for simple script might not be needed
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(fix_constraints())
