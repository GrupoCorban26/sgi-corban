import asyncio
import logging
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# CODIFICAR contraseña y construir URL
password_encoded = urllib.parse.quote_plus(settings.DB_PASS)

# Para Driver 18+ es vital 'TrustServerCertificate=yes' en local
DB_URL = (
    f"mssql+aioodbc://{settings.DB_USER}:{password_encoded}@{settings.DB_SERVER}/{settings.DB_NAME}?"
    f"driver={settings.DB_DRIVER}&TrustServerCertificate=yes"
)

# Crear el motor asíncrono
engine = create_async_engine(
    DB_URL, 
    echo=settings.DB_ECHO,
    pool_size=10,           # Conexiones que se mantienen abiertas siempre
    max_overflow=20,        # Conexiones extra en picos (total max: 30)
    pool_recycle=1800,      # Reinicia las conexiones cada 30 min
    pool_pre_ping=True,     # Verifica si la conexión está viva antes de usarla
    pool_timeout=10,        # Timeout de espera cuando el pool está lleno
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
            logger.info(f"Conectado a: {DB_NAME} en {DB_SERVER}")
    except Exception as e:
        logger.error(f"Error en la conexión asíncrona: {e}")

if __name__ == "__main__":
    # Para probar código 'async' fuera de FastAPI necesitamos asyncio
    asyncio.run(test_connection())