import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.settings import get_settings
from app.database.db_connection import get_db
from app.services.auth import AuthService
from app.models.seguridad import Usuario

logger = logging.getLogger(__name__)

settings = get_settings()

# --- CONFIGURACIÓN ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

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
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DEPENDENCIAS DE SEGURIDAD (LOS GUARDIAS) ---

async def get_current_active_auth(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    DEPENDENCIA MAESTRA: 
    1. Decodifica el JWT para obtener identidad (sub, roles, permisos)
    2. Verifica sesión activa en BD (no revocada, no expirada por inactividad)
    3. Extiende la sesión (sliding expiration) automáticamente
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decodificar JWT para obtener identidad
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            logger.debug(f"Token decoded successfully. Sub: {payload.get('sub')}")
        except jwt.ExpiredSignatureError:
            logger.warning("Token JWT expirado")
            raise credentials_exception
        except Exception as e:
            logger.warning(f"Token Decode Failed: {e}")
            raise credentials_exception

        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' (user_id)")
            raise credentials_exception
            
        # 2. Verificar sesión activa en BD + Extender (una sola operación)
        auth_svc = AuthService(db)
        is_active = await auth_svc.verificar_y_extender_sesion(token)
        if not is_active:
            logger.warning(f"Session check failed for user {user_id}")
            raise credentials_exception
            
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

    # Si no tiene empleado asociado, lanzar error explícito
    if eid is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene un empleado asociado."
        )
    return int(eid)

def get_current_token_payload(payload: dict = Depends(get_current_active_auth)) -> dict:
    """Retorna el diccionario completo de datos del token (roles, permisos, etc)."""
    return payload