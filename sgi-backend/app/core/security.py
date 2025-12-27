from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

# Configuración de hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de JWT (Cámbialo por algo seguro en tu .env)
SECRET_KEY = "tu_clave_secreta_super_segura_para_corban"
ALGORITHM = "HS256"

def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def crear_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)