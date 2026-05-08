import asyncio
import logging
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Construir cadena de conexión ODBC nativa (soporta instancias con nombre como localhost\SQLEXPRESS)
if settings.DB_TRUSTED:
    odbc_connection_string = (
        f"DRIVER={{{settings.DB_DRIVER}}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
        f"TrustServerCertificate=yes;"
        f"LoginTimeout=30;"
    )
else:
    odbc_connection_string = (
        f"DRIVER={{{settings.DB_DRIVER}}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASS};"
        f"TrustServerCertificate=yes;"
        f"LoginTimeout=30;"
    )

# URL-encode la cadena ODBC completa para SQLAlchemy
DB_URL = f"mssql+aioodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_connection_string)}"

# Crear el motor asíncrono
engine = create_async_engine(
    DB_URL, 
    echo=settings.DB_ECHO,
    pool_size=30,           # Aumentado para soportar los webhooks de Evolution
    max_overflow=70,        # Total máximo 100 conexiones
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_timeout=30,        # Esperar un poco más si hay cuellos de botella
)

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
            logger.info("Conexión asíncrona exitosa")
            logger.info(f"Conectado a: {settings.DB_NAME} en {settings.DB_SERVER}")
    except Exception as e:
        logger.error(f"Error en la conexión asíncrona: {e}")

if __name__ == "__main__":
    # Para probar código 'async' fuera de FastAPI necesitamos asyncio
    asyncio.run(test_connection())