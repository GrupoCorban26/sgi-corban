from pydantic import BaseModel, EmailStr
from typing import List, Optional

# Lo que recibimos del Frontend (Login)
class UserLoginSchema(BaseModel):
    correo: EmailStr  # Valida automáticamente que sea un email real
    password: str

# Estructura del Token que devolvemos
class Token(BaseModel):
    access_token: str
    token_type: str
    nombre: str
    permisos: List[str]

# Para errores o respuestas simples
class Msg(BaseModel):
    msg: str