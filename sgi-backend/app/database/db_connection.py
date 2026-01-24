import asyncio
import urllib.parse
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# 1. Cargar variables
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_DRIVER = os.getenv("DB_DRIVER")

# 2. CODIFICAR contraseña y construir URL
# ¡Importante!: Usamos password_encoded dentro del f-string
password_encoded = urllib.parse.quote_plus(DB_PASS)

# Para Driver 18+ es vital 'TrustServerCertificate=yes' en local
DB_URL = (
    f"mssql+aioodbc://{DB_USER}:{password_encoded}@{DB_SERVER}/{DB_NAME}?"
    f"driver={DB_DRIVER}&TrustServerCertificate=yes"
)

# 3. Crear el motor asíncrono (echo=True solo si DB_ECHO=true)
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"
engine = create_async_engine(DB_URL, echo=DB_ECHO)

# Fábrica de sesiones
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Generador para FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# --- PRUEBA DE CONEXIÓN ASÍNCRONA ---
async def test_connection():
    try:
        # En motores asíncronos se usa "async with engine.begin()"
        async with engine.begin() as conn:
            print("✅ ¡Conexión asíncrona exitosa!")
            print(f"Conectado a: {DB_NAME} en {DB_SERVER}")
    except Exception as e:
        print("❌ Error en la conexión asíncrona:")
        print(e)

if __name__ == "__main__":
    # Para probar código 'async' fuera de FastAPI necesitamos asyncio
    asyncio.run(test_connection())