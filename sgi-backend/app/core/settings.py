"""
Configuración centralizada del proyecto SGI usando Pydantic Settings.

Lee las variables de entorno desde el archivo .env y valida que las
variables críticas estén presentes al momento de arrancar el servidor.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuración centralizada del backend SGI."""

    # ========================
    # Base de datos (SQL Server)
    # ========================
    DB_SERVER: str
    DB_NAME: str
    DB_USER: str
    DB_PASS: str
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_ECHO: bool = False

    # ========================
    # Seguridad / JWT
    # ========================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas (jornada laboral)

    # ========================
    # CORS
    # ========================
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Retorna los orígenes CORS como lista."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # ========================
    # WhatsApp Cloud API
    # ========================
    WHATSAPP_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_ID: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None

    # ========================
    # OpenAI
    # ========================
    OPENAI_API_KEY: Optional[str] = None

    # ========================
    # Comercial / Bot
    # ========================
    BOT_JEFE_COMERCIAL_ID: Optional[int] = None
    SGI_WEB_API_KEY: Optional[str] = None  # API Key para el endpoint público de leads web

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

@lru_cache()
def get_settings() -> Settings:
    """Retorna la instancia cacheada de Settings. Falla al importar si faltan variables."""
    return Settings()
