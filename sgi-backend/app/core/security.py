import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Importaciones internas (ajusta las rutas según tu estructura)
from app.database.db_connection import get_db
from app.services.auth import verificar_sesion_activa, extender_sesion
from app.models.seguridad import Usuario

load_dotenv()

# --- CONFIGURACIÓN ---
# Clave secreta del .env
SECRET_KEY = os.getenv("SECRET_KEY")
# Algoritmo por usar
ALGORITHM = os.getenv("ALGORITHM", "HS256")
# Minutos de expiración del TOKEN JWT (Ahora 24 horas para permitir sliding window en BD)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")

# --- UTILIDADES DE CONTRASEÑA ---

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hashear_password(password: str) -> str:
    return pwd_context.hash(password)

# --- EMISIÓN DE TOKENS ---

def crear_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un JWT firmado con los datos del usuario."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    # Nota: No necesitamos update individual de 'role' porque ya viene en 'data'
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DEPENDENCIAS DE SEGURIDAD (LOS GUARDIAS) ---

async def get_current_active_auth(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    DEPENDENCIA MAESTRA: 
    Merged login/active session check.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decodificar y validar tiempo (automático en jwt.decode)
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            logger.debug(f"Token decoded successfully. Sub: {payload.get('sub')}")
        except Exception as e:
            logger.warning(f"Token Decode Failed: {e}")
            raise credentials_exception

        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' (user_id)")
            raise credentials_exception
            
        # 2. Verificar sesión activa en la tabla de base de datos
        # Esto comprueba Revocación + Inactividad (30 min)
        is_active = await verificar_sesion_activa(db, token)
        if not is_active:
            logger.warning(f"Session check failed for user {user_id}")
            raise credentials_exception
            
        # 3. EXPANSIÓN DE SESIÓN (Sliding Expiration)
        # Si la sesión es válida, intentamos extenderla
        # await extender_sesion(db, token) # Comentado temporalmente para aislar el problema si es DB write
        await extender_sesion(db, token) 
            
        return payload

    except (JWTError, ValueError) as e:
        logger.warning(f"JWT Error or Value Error: {e}")
        raise credentials_exception

# --- DEPENDENCIAS DE CONVENIENCIA (Basadas en la Maestra) ---

async def get_current_user_id(
    payload: dict = Depends(get_current_active_auth)
) -> int:
    """Retorna solo el ID del usuario como entero."""
    return int(payload.get("sub"))

async def get_current_empleado_id(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_active_auth)
) -> int:
    """
    Retorna el empleado_id. Si no está en el token, lo busca en BD.
    """
    empleado_id = payload.get("empleado_id")
    if empleado_id is not None:
        return int(empleado_id)

    # Si no está en el payload, fallback a base de datos
    user_id = int(payload.get("sub"))
    stmt = select(Usuario.empleado_id).where(Usuario.id == user_id)
    result = await db.execute(stmt)
    eid = result.scalar()
    
    return int(eid) if eid else 0

def get_current_token_payload(payload: dict = Depends(get_current_active_auth)) -> dict:
    """Retorna el diccionario completo de datos del token (roles, permisos, etc)."""
    return payload