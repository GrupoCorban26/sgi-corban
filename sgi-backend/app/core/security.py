# app/core/security.py
import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

load_dotenv()

# --- CONFIGURACIÓN ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Herramienta para encriptar claves (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Herramienta para extraer el token de la cabecera (Bearer Token)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")

# --- FUNCIONES DE "EMISIÓN" (Para el Login) ---

def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hashear_password(password: str) -> str:
    """Genera el hash de una contraseña para almacenarla en la BD"""
    return pwd_context.hash(password)

def crear_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    to_encode.update({"role": data.get("role")})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- FUNCIÓN DE "VALIDACIÓN" (Para proteger rutas) ---

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    Esta función actúa como un 'guardia'. 
    Si el token es inválido, detiene la petición antes de llegar al SP.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Intentamos abrir el token con nuestra SECRET_KEY
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 2. Extraemos el ID del usuario (que guardamos en el campo 'sub')
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        return int(user_id)
        
    except (JWTError, ValueError):
        # Si el token fue manipulado o expiró, lanzamos el error
        raise credentials_exception


def get_current_empleado_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    Extrae el empleado_id del token JWT.
    El empleado_id se guarda en el campo 'empleado_id' del token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        empleado_id = payload.get("empleado_id")
        
        if empleado_id is None:
            # Si no hay empleado_id en el token, usar el user_id como fallback
            user_id = payload.get("sub")
            return int(user_id) if user_id else 0
            
        return int(empleado_id)
        
    except (JWTError, ValueError):
        raise credentials_exception