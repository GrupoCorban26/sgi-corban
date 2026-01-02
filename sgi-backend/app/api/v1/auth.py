from fastapi import APIRouter, Depends, HTTPException, status
# 1. Quitamos OAuth2PasswordRequestForm e importamos tu esquema
from app.schemas.auth import UserLoginSchema 
from sqlalchemy.ext.asyncio import AsyncSession # Asegúrate de usar AsyncSession si tu service es async
from app.database.db_connection import get_db 
from app.core import security
from app.services.auth import obtener_usuario_por_correo

router = APIRouter(prefix="/login", tags=["Seguridad"])

@router.post("/")
async def login(
    # 2. Cambiamos el Depends del formulario por tu Schema de Pydantic
    payload: UserLoginSchema, 
    db: AsyncSession = Depends(get_db) # Cambiado a AsyncSession para consistencia con tu service
):
    # 3. Accedemos a los datos mediante 'payload.correo' (ya no es .username)
    user_data = await obtener_usuario_por_correo(db, payload.correo)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Usuario o contraseña incorrectos" # Mejor mensaje por seguridad
        )

    # 4. Verificamos contraseña usando 'payload.password'
    if not security.verificar_password(payload.password, user_data['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Usuario o contraseña incorrectos"
        )
    
    # 3. Validar si está bloqueado
    if user_data['is_bloqueado']:
        raise HTTPException(status_code=403, detail="Cuenta bloqueada")

    # 4. Generar Token
    access_token = security.crear_access_token(
        data={
            "sub": str(user_data['usuario_id']),
            "nombre": user_data['nombre_corto'],
            "permisos": user_data['permisos'],
            "area": user_data['area_nombre']
        }
    )

    # Devolvemos la respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "nombre": user_data['nombre_corto'],
            "area": user_data['area_nombre'],
            "cargo": user_data['cargo_nombre'],
            "debe_cambiar_password": user_data['debe_cambiar_password']
        }
    }